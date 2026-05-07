import { BookingStatus } from './enums';

export interface BookingListItem {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyPrimaryImageUrl?: string;
  startDate: string;
  endDate: string;
  status: string;
  createdOnUtc: string;
}

export interface BookingDetail {
  id: string;
  propertyId: string;
  propertyTitle: string;
  userId: string;
  agentUserId: string;
  startDate: string;
  endDate: string;
  status: string;
  amount: number;
  currency: string;
  commissionRate: number;
  paymentId?: string;
  // [BACKEND_MISSING]: The backend doesn't return payer contact info in BookingDto yet.
  /* payerName?: string;
  payerEmail?: string;
  payerPhone?: string; */
  createdOnUtc: string;
}

export interface CreateBookingRequest {
  propertyId: string;
  startDate: string;
  endDate: string;
  amount: number;
  commissionRate: number;
  currency: string;
  // [BACKEND_MISSING]: The backend doesn't expect payer info during creation yet.
  /* payerEmail: string;
  payerName: string;
  payerPhone: string; */
}

export interface CreateBookingResponse {
  bookingId: string;
  paymentId: string;
  redirectUrl?: string;
}

export interface UpdateBookingStatusRequest {
  status: BookingStatus;
}
