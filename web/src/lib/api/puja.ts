import { supabase, localized } from '@/lib/supabase';
import { friendlyRpcError } from '@/lib/api/errors';

export interface Puja {
  id: string;
  slug?: string;
  templeId?: string;
  title: string;
  templeName: string;
  priceRupees: number;
  category: string;
  isFeatured: boolean;
  imageUrl?: string;
  description?: string;
  location?: string;
  dateTimeStr?: string;
  durationStr?: string;
  priestName?: string;
  priestTitle?: string;
  priestExp?: string;
  significance?: string;
  specialTag?: string;
  devoteesCount?: string;
  requiresSankalpa?: boolean;
  requiresNakshatra?: boolean;
  offeringKind?: string;
  availableDays?: number[]; // 0=Sun … 6=Sat, mirrors puja_offerings.available_days
  leadTimeDays?: number;
  maxPerDay?: number | null;
}

export interface PujaBooking {
  id?: string;
  pujaId: string;
  pujaTitle: string;
  templeName: string;
  amountRupees: number;
  sankalpaName: string;
  gotra?: string;
  nakshatra?: string;
  familyMembers?: string[];
  status?: string;
  bookingDate?: string;
  confirmationRef?: string;
  quantity?: number;
}

export const BOOKING_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: 'Please sign in to book this offering.',
  offering_not_found: 'This offering is no longer available.',
  invalid_quantity: 'Please choose between 1 and 20 bookings.',
  date_required: 'Please select a booking date.',
  temple_unavailable: 'This temple is not accepting bookings right now.',
  invalid_family_member: 'One of the selected family members was not found.',
  date_too_soon: 'This offering needs more advance notice for the selected date.',
  date_unavailable: 'This offering is not performed on the selected day.',
  slot_full: 'All slots are taken for the selected date. Please pick another day.',
  sankalpa_required: 'A devotee name is required for the Sankalpa.',
  nakshatra_required: 'Please provide the devotee\u2019s Nakshatra (birth star).',
};

export async function getPujas(category?: string, search?: string): Promise<{ pujas: Puja[], count: number }> {
  let query = supabase
    .from('puja_offerings')
    .select('id,slug,temple_id,name,name_i18n,description_i18n,significance_i18n,price,image_url,popular,priest_name,duration_min,offering_kind,requires_sankalpa,requires_nakshatra,available_days,lead_time_days,max_per_day,temples(name,address)', { count: 'exact' })
    .eq('status', 'published')
    .order('popular', { ascending: false });
  if (category && category !== 'All') query = query.eq('offering_kind', category.toLowerCase());
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error, count } = await query;
  if (error) throw error;
  return {
    count: count ?? 0,
    pujas: (data ?? []).map((row: any) => {
      const temple = row.temples;
      return {
        id: row.id,
        slug: row.slug,
        templeId: row.temple_id,
        title: row.name || localized(row.name_i18n),
        templeName: temple?.name || 'Temple',
        location: temple?.address || undefined,
        priceRupees: Number(row.price) / 100,
        category: 'Vazhipadu',
        isFeatured: Boolean(row.popular),
        imageUrl: row.image_url || undefined,
        description: localized(row.description_i18n),
        significance: localized(row.significance_i18n),
        priestName: row.priest_name || undefined,
        durationStr: row.duration_min ? `${row.duration_min} minutes` : undefined,
        requiresSankalpa: row.requires_sankalpa ?? false,
        requiresNakshatra: row.requires_nakshatra ?? false,
        offeringKind: row.offering_kind ?? undefined,
        availableDays: row.available_days ?? [0, 1, 2, 3, 4, 5, 6],
        leadTimeDays: row.lead_time_days ?? 0,
        maxPerDay: row.max_per_day ?? null,
      };
    }),
  };
}

export async function getBookings(): Promise<{ bookings: PujaBooking[] }> {
  const { data, error } = await supabase
    .from('puja_bookings')
    .select('id,offering_id,booking_date,quantity,amount,status,sankalpa,confirmation_ref,puja_offerings(name),temples(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return {
    bookings: (data ?? []).map((row: any) => ({
      id: row.id,
      pujaId: row.offering_id,
      pujaTitle: row.puja_offerings?.name || 'Pooja offering',
      templeName: row.temples?.name || 'Temple',
      amountRupees: Number(row.amount) / 100,
      sankalpaName: row.sankalpa?.devotee_name || row.sankalpa?.name || '',
      gotra: row.sankalpa?.gotra,
      nakshatra: row.sankalpa?.nakshatra,
      status: row.status,
      bookingDate: row.booking_date,
      confirmationRef: row.confirmation_ref,
      quantity: row.quantity,
    })),
  };
}

export interface CreateBookingInput {
  pujaId: string;
  bookingDate: string; // YYYY-MM-DD
  sankalpaName: string;
  gotra?: string;
  nakshatra?: string;
  quantity?: number;
  notes?: string;
  prasadam?: 'none' | 'collect' | 'post';
  familyMemberIds?: string[];
}

export async function createBooking(input: CreateBookingInput): Promise<{ success: boolean; bookingId: string; confirmationRef?: string; status?: string; amountRupees?: number }> {
  const { data, error } = await supabase.rpc('create_puja_booking', {
    p_offering_id: input.pujaId,
    p_booking_date: input.bookingDate,
    p_quantity: input.quantity ?? 1,
    p_sankalpa: {
      devotee_name: input.sankalpaName,
      gotra: input.gotra || null,
      nakshatra: input.nakshatra || null,
    },
    p_family_member_ids: input.familyMemberIds ?? [],
    p_notes: input.notes || null,
    p_prasadam: input.prasadam ?? 'none',
  });
  if (error) throw new Error(friendlyRpcError(error, BOOKING_ERROR_MESSAGES, 'The booking could not be completed. Please try again.'));
  return {
    success: true,
    bookingId: data?.id || 'pending',
    confirmationRef: data?.confirmation_ref || undefined,
    status: data?.status || undefined,
    amountRupees: data?.amount != null ? Number(data.amount) / 100 : undefined,
  };
}
