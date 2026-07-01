import { getTransitServiceDates } from "@/services/transit/transitRepository";

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function isServiceAvailable(serviceId: string, date: Date = new Date()): boolean {
  const serviceMap = getTransitServiceDates();
  const serviceDatesList = serviceMap[serviceId];
  if (!serviceDatesList) return false;
  return serviceDatesList.includes(formatDate(date));
}

/**
 * Comprueba si un serviceId está activo en la fecha dada O en el día anterior.
 * Útil para servicios nocturnos que comienzan antes de medianoche pero cuya
 * madrugada pertenece técnicamente al día siguiente.
 */
export function isServiceActiveWithOvernight(serviceId: string, date: Date = new Date()): boolean {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return isServiceAvailable(serviceId, date) || isServiceAvailable(serviceId, yesterday);
}
