declare module "midtrans-client" {
  interface Config {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  interface SnapResponse {
    token: string;
    redirect_url: string;
  }

  interface TransactionAPI {
    status(orderId: string): Promise<Record<string, unknown>>;
    cancel(orderId: string): Promise<Record<string, unknown>>;
  }

  class Snap {
    constructor(config: Config);
    transaction: TransactionAPI;
    createTransaction(
      params: Record<string, unknown>,
    ): Promise<SnapResponse>;
  }

  class CoreApi {
    constructor(config: Config);
    transaction: TransactionAPI;
    charge(params: Record<string, unknown>): Promise<Record<string, unknown>>;
  }
}
