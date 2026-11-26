export class BalanceConfig {

    /**
     * Gets the configuration instance.
     */
    public static getInstance(): BalanceConfig {
        if (BalanceConfig.instance) {
            return BalanceConfig.instance;
        }
        const config: BalanceConfig = new BalanceConfig();

        config.stableCoinName = process.env.STABLE_COIN_NAME || "Euro";
        config.stableCoinSymbol = process.env.STABLE_COIN_SYMBOL || "EUR";
        config.stableCoinDecimals = parseInt(process.env.STABLE_COIN_DECIMALS || "2", 10);
        config.tokensNubemEnabled = (process.env.TOKENS_NUBEM_ENABLED || "YES").toUpperCase() !== "NO";

        BalanceConfig.instance = config;

        return config;
    }

    private static instance: BalanceConfig;

    public stableCoinName: string;
    public stableCoinSymbol: string;
    public stableCoinDecimals: number;
    public tokensNubemEnabled: boolean;

    private constructor() {
        this.stableCoinName = "Euro";
        this.stableCoinSymbol = "EUR";
        this.stableCoinDecimals = 2;
        this.tokensNubemEnabled = true;
    }


}