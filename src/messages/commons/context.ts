export class Context {
    domain: string;
    action: string;

    /**
     * Creates a new Context instance.
     * @param domain The domain of the context.
     * @param action The action of the context.
     */
    constructor(domain: string, action: string) {
        this.domain = domain;
        this.action = action;
    }

    /**
     * Creates a new Context instance from a JSON object.
     * @param json The JSON object representing the context.
     * @returns A new Context instance.
     */
    static fromJson(json: Record<string, any>): Context {
        const jsonData = json as { domain: string; action: string };
        return new Context(jsonData.domain, jsonData.action);
    }

    /**
     * Creates a new Context instance from a compact JSON object.
     * @param json The compact JSON object representing the context.
     * @returns A new Context instance.
     */
    static fromCompactJson(json: Record<string, any>): Context {
        const jsonCompact = json as { d: string; a: string };
        return new Context(jsonCompact.d, jsonCompact.a);
    }

    /**
     * Creates a new Context instance from a minimal compact JSON object.
     * @param json The minimal compact JSON object representing the context.
     * @returns A new Context instance.
     */
    static fromMinimalCompactJson(json: Record<string, any>): Context {
        return this.fromCompactJson(json);
    }

    /**
     * Converts the Context instance to a JSON object.
     * @returns The JSON object representing the context.
     */
    toJson(): Record<string, any> {
        return {
            domain: this.domain,
            action: this.action,
        };
    }

    /**
     * Converts the Context instance to a compact JSON object.
     * @returns The compact JSON object representing the context.
     */
    toCompactJson(): Record<string, any> {
        return {
            d: this.domain,
            a: this.action,
        };
    }

    /**
     * Converts the Context instance to a minimal compact JSON object.
     * @returns The minimal compact JSON object representing the context.
     */
    toMinimalCompactJson(): Record<string, any> {
        return this.toCompactJson();
    }
}
