import { describe, expect, it } from "vitest";
import {
  CancelWmsOrderInputSchema,
  ChangeWmsShippingAddressInputSchema,
  ExchangeWmsOrderInputSchema,
  GetWmsOrdersInputSchema,
  GetWmsOrdersOutputSchema,
  GetWmsOrderOutputSchema,
  GetWmsShopIdInputSchema,
  GetWmsShopIdOutputSchema,
  GetWmsSupportedCommercesInputSchema,
  GetWmsSupportedCommercesOutputSchema,
  RestoreWmsOrderInputSchema,
  ReturnWmsOrderInputSchema,
  WmsOrderCancelInputSchema,
  WmsOrderExchangeInputSchema,
  WmsOrderReturnInputSchema,
  WmsOrderSchema,
  WmsSuccessOutputSchema,
} from "../../extensions/wms.js";
import { WmsFunctionNames } from "../../extensions/interfaces/wms.js";
import type {
  CancelWmsOrderInput,
  ExchangeWmsOrderInput,
  GetWmsShopIdOutput,
  ReturnWmsOrderInput,
} from "../../extensions/interfaces/wms.js";

describe("WMS extension helpers", () => {
  it("should expose full function names", () => {
    expect(WmsFunctionNames.getSupportedCommerces).toBe(
      "extension.wms.metadata.getSupportedCommerces"
    );
    expect(WmsFunctionNames.getOrders).toBe("extension.wms.core.getOrders");
    expect(WmsFunctionNames.getOrder).toBe("extension.wms.core.getOrder");
    expect(WmsFunctionNames.getShopId).toBe("extension.wms.core.getShopId");
    expect(WmsFunctionNames.cancelOrder).toBe("extension.wms.cancel.cancelOrder");
    expect(WmsFunctionNames.restoreCanceledOrder).toBe("extension.wms.cancel.restoreOrder");
    expect(WmsFunctionNames.returnOrder).toBe("extension.wms.return.returnOrder");
    expect(WmsFunctionNames.restoreReturnedOrder).toBe("extension.wms.return.restoreOrder");
    expect(WmsFunctionNames.exchangeOrder).toBe("extension.wms.exchange.exchangeOrder");
    expect(WmsFunctionNames.restoreExchangedOrder).toBe("extension.wms.exchange.restoreOrder");
    expect(WmsFunctionNames.changeShippingAddress).toBe("extension.wms.edit.changeShippingAddress");
    expect(WmsFunctionNames).not.toHaveProperty("restoreOrder");
  });

  it("should parse a WMS order shape", () => {
    expect(
      WmsOrderSchema.parse({
        extId: "order-1",
        extCommerceOrderId: "commerce-order-1",
        items: [
          {
            extId: "item-1",
            extCommerceOrderItemId: "commerce-item-1",
            productName: "T-shirt",
            quantity: 2,
            state: "paid",
          },
        ],
        deliveries: [
          {
            extId: "delivery-1",
            itemIds: ["item-1"],
          },
        ],
      })
    ).toMatchObject({
      extId: "order-1",
      extCommerceOrderId: "commerce-order-1",
    });
  });

  it("should parse item-level shipping info", () => {
    expect(
      WmsOrderSchema.parse({
        extId: "order-1",
        extCommerceOrderId: "commerce-order-1",
        items: [
          {
            extId: "item-1",
            extCommerceOrderItemId: "commerce-item-1",
            shippingInfo: {
              name: "Perry",
              mobileNumber: "01012345678",
              zipcode: "12345",
              address1: "Seoul",
              address2: "101",
            },
          },
        ],
        deliveries: [],
      }).items[0]?.shippingInfo
    ).toMatchObject({
      name: "Perry",
      zipcode: "12345",
    });
  });

  it("should type SSOT action inputs and nullable getShopId output", () => {
    const cancelWithOrderId: CancelWmsOrderInput = { orderId: "order-1", reason: "sold out" };
    const cancelWithLegacyOrderIds: CancelWmsOrderInput = { orderIds: "order-1,order-2" };
    const returnInput: ReturnWmsOrderInput = { orderId: "order-1", memo: "customer request" };
    const exchangeInput: ExchangeWmsOrderInput = { orderIds: "order-1", reason: "size" };
    const shopIdOutput: GetWmsShopIdOutput = { shopId: null, message: "not found" };

    expect([
      cancelWithOrderId.orderId,
      cancelWithLegacyOrderIds.orderIds,
      returnInput.orderId,
      exchangeInput.orderIds,
      shopIdOutput.shopId,
    ]).toEqual(["order-1", "order-1,order-2", "order-1", "order-1", null]);
  });

  it("should expose Zod schemas for WMS function contracts", () => {
    const order = {
      extId: "order-1",
      extCommerceOrderId: "commerce-order-1",
      items: [
        {
          extId: "item-1",
          extCommerceOrderItemId: "commerce-item-1",
          productName: "T-shirt",
          quantity: 2,
        },
      ],
      deliveries: [
        {
          extId: "delivery-1",
          itemIds: ["item-1"],
        },
      ],
    };

    expect(GetWmsOrdersInputSchema.parse({ commerceOrderIds: "commerce-order-1" })).toEqual({
      commerceOrderIds: "commerce-order-1",
    });
    expect(GetWmsOrdersOutputSchema.parse({ orders: [order] })).toEqual({ orders: [order] });
    expect(GetWmsOrderOutputSchema.parse({ order })).toEqual({ order });
    expect(
      GetWmsShopIdInputSchema.parse({
        commerceType: "appCafe24",
        commerceKey: "mallId-shopNo-shopName",
      })
    ).toEqual({
      commerceType: "appCafe24",
      commerceKey: "mallId-shopNo-shopName",
    });
    expect(
      GetWmsShopIdInputSchema.parse({
        commerceType: "appNaverSmartStore",
        commerceKey: "account%2Did-account%2Duid",
      })
    ).toEqual({
      commerceType: "appNaverSmartStore",
      commerceKey: "account%2Did-account%2Duid",
    });
    expect(GetWmsShopIdOutputSchema.parse({ shopId: null, message: "not found" })).toEqual({
      shopId: null,
      message: "not found",
    });
    expect(GetWmsSupportedCommercesInputSchema.parse({})).toEqual({});
    expect(
      GetWmsSupportedCommercesOutputSchema.parse({
        commerceTypes: ["appCafe24"],
      })
    ).toEqual({
      commerceTypes: ["appCafe24"],
    });
    expect(() => GetWmsShopIdInputSchema.parse({ commerceType: "appCafe24" })).toThrow();
    expect(() =>
      GetWmsShopIdInputSchema.parse({ commerceKey: "mallId-shopNo-shopName" })
    ).toThrow();
    expect(CancelWmsOrderInputSchema.parse({ orderId: "order-1" })).toEqual({
      orderId: "order-1",
    });
    expect(ReturnWmsOrderInputSchema.parse({ orderIds: "order-1", memo: "memo" })).toEqual({
      orderIds: "order-1",
      memo: "memo",
    });
    expect(ExchangeWmsOrderInputSchema.parse({ orderId: "order-1", reason: "size" })).toEqual({
      orderId: "order-1",
      reason: "size",
    });
    expect(ExchangeWmsOrderInputSchema.parse({ orderIds: "order-1", memo: "memo" })).toEqual({
      orderIds: "order-1",
      memo: "memo",
    });
    expect(
      ChangeWmsShippingAddressInputSchema.parse({
        orderId: "order-1",
        recipient: "Perry",
        phone: "01012345678",
        address1: "Seoul",
        postalCode: "12345",
      })
    ).toMatchObject({
      orderId: "order-1",
      recipient: "Perry",
    });
    expect(RestoreWmsOrderInputSchema.parse({ orderId: "order-1", restorePack: true })).toEqual({
      orderId: "order-1",
      restorePack: true,
    });
    expect(WmsSuccessOutputSchema.parse({ success: true, message: "ok" })).toEqual({
      success: true,
      message: "ok",
    });
    expect(() => GetWmsShopIdOutputSchema.parse({ shopId: null, message: null })).toThrow();
    expect(() => CancelWmsOrderInputSchema.parse({ reason: "sold out" })).toThrow();
    expect(() => ReturnWmsOrderInputSchema.parse({ reason: "return" })).toThrow();
    expect(() => ExchangeWmsOrderInputSchema.parse({ reason: "exchange" })).toThrow();
  });

  it("should accept item-level quantities on order-group request actions", () => {
    expect(
      WmsOrderCancelInputSchema.parse({
        orderIds: ["order-1"],
        cancelItems: [{ id: "item-1", quantity: 1 }],
      })
    ).toEqual({ orderIds: ["order-1"], cancelItems: [{ id: "item-1", quantity: 1 }] });
    expect(
      WmsOrderReturnInputSchema.parse({ orderIds: ["order-1"], returnItems: [{ id: "item-1" }] })
    ).toEqual({ orderIds: ["order-1"], returnItems: [{ id: "item-1" }] });
    expect(
      WmsOrderExchangeInputSchema.parse({
        orderIds: ["order-1"],
        exchangeItems: [{ id: "item-1", quantity: 2 }],
      })
    ).toEqual({ orderIds: ["order-1"], exchangeItems: [{ id: "item-1", quantity: 2 }] });
    // Omitting the items keeps the whole-order request valid.
    expect(WmsOrderReturnInputSchema.parse({ orderIds: ["order-1"] })).toEqual({
      orderIds: ["order-1"],
    });
    expect(() =>
      WmsOrderReturnInputSchema.parse({ orderIds: ["order-1"], returnItems: [{ quantity: 1 }] })
    ).toThrow();
    expect(() =>
      WmsOrderReturnInputSchema.parse({ orderIds: ["order-1"], returnItems: [{ id: "" }] })
    ).toThrow();
    expect(() =>
      WmsOrderReturnInputSchema.parse({
        orderIds: ["order-1"],
        returnItems: [{ id: "item-1", quantity: -1 }],
      })
    ).toThrow();
    expect(() =>
      WmsOrderReturnInputSchema.parse({
        orderIds: ["order-1"],
        returnItems: [{ id: "item-1", quantity: 2147483648 }],
      })
    ).toThrow();
    expect(() =>
      WmsOrderCancelInputSchema.parse({
        orderIds: ["order-1"],
        cancelItems: [{ id: "item-1", quantity: 1.5 }],
      })
    ).toThrow();
  });
});
