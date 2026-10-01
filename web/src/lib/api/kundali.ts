import { supabase } from '@/lib/supabase';

export interface JanmaChart {
  janmaNakshatra: string;
  pada: number;
  nakshatraDeity: string;
  nakshatraLord: string;
  moonRashi: string;
  sunRashi: string;
  tithi: string;
  lagna: string | null;
  suggestedWorship: string;
  note?: string;
}

export interface KundaliResult {
  chart: JanmaChart;
  narration: string | null;
}

// Uses saved profile birth details when args are omitted.
export async function getJanmaChart(input?: { dob?: string; tob?: string; pob?: string }): Promise<KundaliResult> {
  const { data, error } = await supabase.functions.invoke<KundaliResult>('kundali-ask', {
    body: input ?? {},
  });
  if (error) throw error;
  if (!data?.chart) throw new Error('No chart returned');
  return data;
}
