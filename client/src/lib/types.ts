export interface Doctor {
  id: string
  name: string
  specialty: string
  qualification: string
  experience_years: number
  fee: number
  rating: number
  reviews_count: number
  hospital: string | null
  city: string | null
  availability: string[]
  about: string | null
  image_url: string | null
  languages: string[]
  created_at: string
  profile_id?: string | null
}

export interface Appointment {
  id: string
  doctor_id: string | null
  patient_name: string
  patient_age: number | null
  patient_gender: string | null
  date: string
  time_slot: string
  type: string
  reason: string | null
  status: string
  notes: string | null
  created_at: string
}

export interface Medicine {
  id: string
  name: string
  brand: string
  category: string
  price: number
  mrp: number
  prescription_required: boolean
  in_stock: boolean
  description: string | null
  pack_size: string | null
  image_url: string | null
  created_at: string
}

export interface MedicineOrder {
  id: string
  order_number: string
  items: { id: string; name: string; brand: string; price: number; quantity: number }[]
  total: number
  delivery_address: string | null
  status: string
  payment_method: string
  created_at: string
}

export interface LabTest {
  id: string
  name: string
  category: string
  price: number
  mrp: number
  description: string | null
  fasting_required: boolean
  report_time: string | null
  sample_type: string | null
  created_at: string
}

export interface LabTestBooking {
  id: string
  test_ids: { id: string; name: string; price: number }[]
  total: number
  patient_name: string
  date: string
  time_slot: string
  home_collection: boolean
  address: string | null
  status: string
  created_at: string
}

export interface HealthRecord {
  id: string
  title: string
  type: string
  date: string
  doctor: string | null
  hospital: string | null
  notes: string | null
  file_url: string | null
  created_at: string
}

export interface Vital {
  id: string
  type: string
  value: string
  unit: string
  recorded_at: string
  notes: string | null
}

export interface Reminder {
  id: string
  title: string
  type: string
  time: string
  frequency: string
  days: string[]
  active: boolean
  notes: string | null
  created_at: string
}

export interface Symptom {
  id: string
  symptom: string
  possible_conditions: { condition: string; specialty: string; urgency: string }[]
  body_part: string | null
  severity: string
}

export interface Hospital {
  id: string
  name: string
  type: string
  address: string | null
  city: string | null
  phone: string | null
  emergency: boolean
  open_24x7: boolean
  rating: number
  lat: number | null
  lng: number | null
  services: string[]
  created_at: string
}

export interface FamilyMember {
  id: string
  name: string
  relation: string
  age: number | null
  gender: string | null
  blood_group: string | null
  conditions: string[]
  allergies: string[]
  phone: string | null
  created_at: string
}

export interface Consultation {
  id: string
  doctor_name: string
  patient_name: string
  date: string
  time_slot: string
  mode: string
  status: string
  symptoms: string | null
  prescription: string | null
  follow_up: boolean
  created_at: string
}

export interface Article {
  id: string
  title: string
  category: string
  excerpt: string
  content: string
  author: string | null
  read_time: string | null
  image_url: string | null
  published_at: string
}

export interface CartItem {
  id: string
  name: string
  brand: string
  price: number
  quantity: number
}

export interface Profile {
  id: string
  full_name: string
  role: 'patient' | 'doctor' | 'receptionist'
  created_at: string
}

export interface Inquiry {
  id: string
  patient_id: string | null
  patient_name: string
  subject: string
  message: string
  status: string
  assigned_to: string | null
  response: string | null
  created_at: string
}
