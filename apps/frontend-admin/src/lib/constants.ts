export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: 'Nuovo',
  CONTACTED: 'Contattato',
  QUALIFIED: 'Qualificato',
  PROPOSAL_SENT: 'Preventivo inviato',
  WON: 'Vinto',
  LOST: 'Perso',
  ARCHIVED: 'Archiviato',
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-indigo-100 text-indigo-700',
  QUALIFIED: 'bg-yellow-100 text-yellow-700',
  PROPOSAL_SENT: 'bg-orange-100 text-orange-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-gray-100 text-gray-600',
};

export const QUOTATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bozza',
  SENT: 'Inviato',
  VIEWED: 'Visualizzato',
  ACCEPTED: 'Accettato',
  REJECTED: 'Rifiutato',
  EXPIRED: 'Scaduto',
  CONVERTED: 'Convertito',
};

export const QUOTATION_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  VIEWED: 'bg-indigo-100 text-indigo-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
  CONVERTED: 'bg-purple-100 text-purple-700',
};

export const CASE_STATUS_LABELS: Record<string, string> = {
  INQUIRY: 'Richiesta',
  CONFIRMED: 'Confermata',
  IN_PROGRESS: 'In corso',
  COMPLETED: 'Completata',
  CANCELLED: 'Annullata',
  REFUNDED: 'Rimborsata',
};

export const CASE_STATUS_COLORS: Record<string, string> = {
  INQUIRY: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-600',
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bozza',
  ISSUED: 'Emessa',
  SENT: 'Inviata',
  PAID: 'Pagata',
  PARTIALLY_PAID: 'Parz. pagata',
  OVERDUE: 'Scaduta',
  CANCELLED: 'Annullata',
  REFUNDED: 'Rimborsata',
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ISSUED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-indigo-100 text-indigo-700',
  PAID: 'bg-green-100 text-green-700',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  REFUNDED: 'bg-purple-100 text-purple-700',
};

export const BOOKING_TYPE_LABELS: Record<string, string> = {
  FLIGHT: 'Volo',
  HOTEL: 'Hotel',
  PACKAGE: 'Pacchetto',
  CRUISE: 'Crociera',
  TRAIN: 'Treno',
  FERRY: 'Traghetto',
  CAR_RENTAL: 'Auto',
  TRANSFER: 'Transfer',
  EXCURSION: 'Escursione',
  INSURANCE: 'Assicurazione',
  VISA: 'Visto',
  TICKET: 'Biglietto',
  OTHER: 'Altro',
};

export const BOOKING_TYPE_ICONS: Record<string, string> = {
  FLIGHT: '✈️',
  HOTEL: '🏨',
  PACKAGE: '📦',
  CRUISE: '🚢',
  TRAIN: '🚂',
  FERRY: '⛴️',
  CAR_RENTAL: '🚗',
  TRANSFER: '🚌',
  EXCURSION: '🗺️',
  INSURANCE: '🛡️',
  VISA: '📋',
  TICKET: '🎫',
  OTHER: '📌',
};
