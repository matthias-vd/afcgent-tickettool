export type Registration = {
  id: string;
  name: string;
  email: string;
  phone: string;
  extraInfo: string;
  foodPreference: string;
  cvOriginalName: string;
  cvStoredName: string;
  ticketToken: string;
  checkedInAt: string | null;
  createdAt: string;
};

export type RegistrationRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  extra_info: string;
  food_preference: string;
  cv_original_name: string;
  cv_stored_name: string;
  ticket_token: string;
  checked_in_at: string | null;
  created_at: string;
};

export function mapRegistration(row: RegistrationRow): Registration {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    extraInfo: row.extra_info,
    foodPreference: row.food_preference,
    cvOriginalName: row.cv_original_name,
    cvStoredName: row.cv_stored_name,
    ticketToken: row.ticket_token,
    checkedInAt: row.checked_in_at,
    createdAt: row.created_at,
  };
}
