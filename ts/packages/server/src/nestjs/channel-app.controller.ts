import { Controller, Put, Body, Param, HttpException, HttpStatus, Logger } from "@nestjs/common";
import {
  type FunctionCallRequest,
  type FunctionCallResponse,
  FunctionNotFoundError,
  ValidationError,
} from "@channel.io/app-sdk-core";
import { ChannelAppService, VersionMismatchError } from "./channel-app.service.js";

@Controller("functions")
export class ChannelAppController {
  private readonly logger = new Logger(ChannelAppController.name);

  constructor(private readonly channelAppService: ChannelAppService) {}

  /**
   * Versioned endpoint: PUT /functions/:version
   * Channel App platform calls this endpoint with systemVersion (e.g., /functions/v1)
   */
  @Put(":version")
  async handleVersionedFunctions(
    @Param("version") version: string,
    @Body() body: FunctionCallRequest
  ): Promise<FunctionCallResponse> {
    return this.handleRequest(body, version);
  }

  /**
   * Common request handler
   */
  private async handleRequest(
    body: FunctionCallRequest,
    version?: string
  ): Promise<FunctionCallResponse> {
    try {
      return await this.channelAppService.handleFunctionCall(body, version);
    } catch (error) {
      this.logger.error(`Error handling function call: ${body.method}`, error);

      if (error instanceof FunctionNotFoundError) {
        throw new HttpException(
          {
            error: "FUNCTION_NOT_FOUND",
            message: error.message,
          },
          HttpStatus.NOT_FOUND
        );
      }

      if (error instanceof ValidationError) {
        throw new HttpException(
          {
            error: "VALIDATION_ERROR",
            message: error.message,
            details: error.details,
          },
          HttpStatus.BAD_REQUEST
        );
      }

      if (error instanceof VersionMismatchError) {
        throw new HttpException(
          {
            error: "VERSION_MISMATCH",
            type: "versionMismatch",
            message: error.message,
            requestedVersion: error.requestedVersion,
            availableVersions: error.availableVersions,
            ...(error.routeVersion === undefined ? {} : { routeVersion: error.routeVersion }),
          },
          HttpStatus.BAD_REQUEST
        );
      }

      // Re-throw unexpected errors
      throw new HttpException(
        {
          error: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
