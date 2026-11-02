interface SubscriptionPeriod {
    status: string;
    current_period_start: Date | string | null;
    current_period_end: Date | string | null;
}

// Las altas MANUAL existentes no tienen fechas. Una cancelación programada conserva
// ACTIVE hasta el fin del período; CANCELED ya no concede acceso.
export const isSubscriptionValid = (subscription: SubscriptionPeriod, now = Date.now()): boolean => {
    if (!['ACTIVE', 'TRIAL'].includes(subscription.status)) return false;
    const start = subscription.current_period_start === null ? null : new Date(subscription.current_period_start).getTime();
    const end = subscription.current_period_end === null ? null : new Date(subscription.current_period_end).getTime();
    return (start === null || (Number.isFinite(start) && start <= now))
        && (end === null || (Number.isFinite(end) && now < end));
};
