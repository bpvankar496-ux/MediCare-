import Doctor from './Doctor.js'
import Appointment from './Appointment.js'
import Medicine from './Medicine.js'
import MedicineOrder from './MedicineOrder.js'
import LabTest from './LabTest.js'
import LabTestBooking from './LabTestBooking.js'
import HealthRecord from './HealthRecord.js'
import Vital from './Vital.js'
import Reminder from './Reminder.js'
import Symptom from './Symptom.js'
import Hospital from './Hospital.js'
import FamilyMember from './FamilyMember.js'
import Consultation from './Consultation.js'
import Article from './Article.js'
import Inquiry from './Inquiry.js'
import Profile from './Profile.js'

// Maps the collection name used by the frontend (same names the old
// Supabase tables had) to its Mongoose model. This is what powers the
// generic /api/:collection REST routes.
export const registry = {
  doctors: Doctor,
  appointments: Appointment,
  medicines: Medicine,
  medicine_orders: MedicineOrder,
  lab_tests: LabTest,
  lab_test_bookings: LabTestBooking,
  health_records: HealthRecord,
  vitals: Vital,
  reminders: Reminder,
  symptoms: Symptom,
  hospitals: Hospital,
  family_members: FamilyMember,
  consultations: Consultation,
  articles: Article,
  inquiries: Inquiry,
  profiles: Profile,
}

// Collections where direct client inserts/deletes are blocked because they
// are managed by the auth flow instead (mirrors the Supabase trigger that
// auto-created `profiles` rows on signup).
export const readOnlyViaGenericApi = new Set(['profiles'])
