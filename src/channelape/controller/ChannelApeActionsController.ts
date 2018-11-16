import { ChannelApeClient } from 'channelape-sdk';
import { Request, Response } from 'express';
import { Logger } from 'channelape-logger';
import * as moment from 'moment';
import * as timers from 'timers';

import Secrets from '../../environment/model/Secrets';

const PARSE_INT_RADIX = 10;

export default abstract class ChannelApeActionsController {
  protected logger: Logger;

  constructor(loggerName: string, protected channelApeClient: ChannelApeClient) {
    this.logger = new Logger(loggerName, Secrets.env.LOG_LEVEL);
  }

  protected abstract processAction(businessId: string, actionId: string): Promise<any>;

  public async handle(req: Request, res: Response): Promise<void | Response> {
    const actionId = req.body.actionId;
    let updateHealthCheckInterval: NodeJS.Timer | undefined = undefined;
    this.logger.info(`Updating healthcheck for action ${actionId}`);
    try {
      const updatedAction = await this.channelApeClient.actions().updateHealthCheck(actionId);
      res.sendStatus(200);
      updateHealthCheckInterval = this.startHealthCheckInterval(
        actionId,
        updatedAction.healthCheckIntervalInSeconds
      );
      const result = await this.processAction(updatedAction.businessId, actionId);
      this.clearHealthCheckInterval(updateHealthCheckInterval);
      return result;
    } catch (e) {
      this.clearHealthCheckInterval(updateHealthCheckInterval);
      if (res.headersSent) {
        this.handleError(e, actionId);
        return;
      }
      res.status(400).send(e);
      return Promise.reject(e);
    }
  }

  private startHealthCheckInterval(actionId: string, intervalInSeconds: number): NodeJS.Timer {
    return timers.setInterval(() => this.updateHealthCheck(actionId), intervalInSeconds * 1000);
  }

  protected updateHealthCheck(actionId: string): void {
    this.logger.info(`Updating healthcheck for action ${actionId}`);
    this.channelApeClient.actions().updateHealthCheck(actionId)
      .catch((err) => {
        this.logger.error(`Failed to update health check for action ${actionId} because ${JSON.stringify(err)}`);
      });
  }

  protected complete(actionId: string): void {
    this.channelApeClient.actions().complete(actionId)
      .then(() => this.logger.info(`Action ${actionId} has been completed`))
      .catch(err => this.logger.error(`Error completing action ${actionId} ${JSON.stringify(err)}`));
  }

  protected handleError(err: any, actionId: string): void {
    let error: any;
    if (err.message === undefined) {
      error = JSON.stringify(err);
    } else {
      error = JSON.stringify(err.message);
    }

    this.logger.error(`Action ${actionId} has failed with error ${error}`);
    this.channelApeClient.actions().error(actionId)
      .then(() => this.logger.info(`Action ${actionId} has been set as errored`))
      .catch(err => this.logger.error(`Error setting action ${actionId} state as errored ${JSON.stringify(err)}`));
  }

  protected getOrderRetrievalStartDate(now: moment.Moment, channelApeOpenOrdersStartDateInveralDays: string): Date {
    const lookBackIntervalDate = now.subtract({
      days: parseInt(channelApeOpenOrdersStartDateInveralDays, PARSE_INT_RADIX)
    });
    const absoluteStartDate = moment(new Date(Secrets.env.CHANNEL_APE_OPEN_ORDERS_DATE));
    if (lookBackIntervalDate.unix() > absoluteStartDate.unix()) {
      return lookBackIntervalDate.toDate();
    }
    return absoluteStartDate.toDate();
  }

  protected getOrderRetrievalEndDate(now: moment.Moment, openOrdersRetrievalDelayMinutes: string): Date {
    return now
      .subtract({ minutes: parseInt(openOrdersRetrievalDelayMinutes, PARSE_INT_RADIX) })
      .toDate();
  }

  private clearHealthCheckInterval(timer: NodeJS.Timer | undefined): void {
    if (timer !== undefined) {
      timers.clearInterval(timer);
    }
  }
}
