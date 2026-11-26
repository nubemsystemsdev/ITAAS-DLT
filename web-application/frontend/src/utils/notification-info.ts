export type NotificationInfoValue = Record<string, unknown> | string | null;

export function parseNotificationInfo(value: unknown): NotificationInfoValue {
    if (!value) {
        return null;
    }

    if (typeof value === "string") {
        const trimmedValue = value.trim();

        if (!trimmedValue) {
            return null;
        }

        if (trimmedValue.startsWith("{") || trimmedValue.startsWith("[")) {
            try {
                const parsedValue = JSON.parse(trimmedValue);
                if (parsedValue && typeof parsedValue === "object") {
                    return parsedValue as Record<string, unknown>;
                }
            } catch {
                return trimmedValue;
            }
        }

        return trimmedValue;
    }

    if (typeof value === "object") {
        return value as Record<string, unknown>;
    }

    return null;
}

export function getInfoField(value: NotificationInfoValue, fieldName: string): string {
    if (!value || typeof value !== "object") {
        return "";
    }

    const fieldValue = value[fieldName];

    return typeof fieldValue === "string" && fieldValue.trim() ? fieldValue.trim() : "";
}

export function getNumberField(value: NotificationInfoValue, fieldName: string): number | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const fieldValue = value[fieldName];

    if (typeof fieldValue === "number" && Number.isFinite(fieldValue)) {
        return fieldValue;
    }

    if (typeof fieldValue === "string" && fieldValue.trim()) {
        const numericValue = Number(fieldValue);
        if (Number.isFinite(numericValue)) {
            return numericValue;
        }
    }

    return null;
}
