// Populates catalog collections with sample data, equivalent to the old
// Supabase seed migration. Appointments, orders, bookings, vitals,
// reminders, records, family members, consultations, and users start empty.
//
// Run with: npm run seed

import 'dotenv/config'
import mongoose from 'mongoose'
import Doctor from './models/Doctor.js'
import Medicine from './models/Medicine.js'
import LabTest from './models/LabTest.js'
import Symptom from './models/Symptom.js'
import Hospital from './models/Hospital.js'
import Article from './models/Article.js'

const doctors = [
  { name: 'Dr. Aanya Sharma', specialty: 'Cardiologist', qualification: 'MD - Cardiology, MBBS', experience_years: 15, fee: 1200, rating: 4.9, reviews_count: 320, hospital: 'Apollo Heart Institute', city: 'Mumbai', availability: ['Mon 10:00-14:00', 'Tue 10:00-14:00', 'Wed 16:00-20:00', 'Fri 10:00-14:00'], about: 'Senior interventional cardiologist specializing in coronary angioplasty and heart failure management.', languages: ['English', 'Hindi', 'Marathi'], image_url: 'https://i.pravatar.cc/300?img=12' },
  { name: 'Dr. Rajesh Kumar', specialty: 'Dermatologist', qualification: 'MD - Dermatology, MBBS', experience_years: 12, fee: 800, rating: 4.8, reviews_count: 210, hospital: 'SkinCare Clinic', city: 'Delhi', availability: ['Mon 09:00-13:00', 'Thu 09:00-13:00', 'Sat 11:00-15:00'], about: 'Expert in cosmetic dermatology, acne treatment, and skin cancer screening.', languages: ['English', 'Hindi'], image_url: 'https://i.pravatar.cc/300?img=47' },
  { name: 'Dr. Priya Nair', specialty: 'Pediatrician', qualification: 'MD - Pediatrics, MBBS', experience_years: 10, fee: 600, rating: 4.9, reviews_count: 410, hospital: 'Rainbow Children Hospital', city: 'Bangalore', availability: ['Mon-Sat 11:00-17:00'], about: 'Pediatrician focused on child development, immunization, and neonatal care.', languages: ['English', 'Malayalam', 'Kannada'], image_url: 'https://i.pravatar.cc/300?img=44' },
  { name: 'Dr. Vikram Singh', specialty: 'Orthopedic Surgeon', qualification: 'MS - Orthopedics, MBBS', experience_years: 18, fee: 1500, rating: 4.7, reviews_count: 180, hospital: 'Fortis Bone and Joint', city: 'Jaipur', availability: ['Tue 10:00-16:00', 'Thu 10:00-16:00', 'Sat 09:00-12:00'], about: 'Joint replacement and sports injury specialist with 18 years experience.', languages: ['English', 'Hindi'], image_url: 'https://i.pravatar.cc/300?img=33' },
  { name: 'Dr. Meera Iyer', specialty: 'Gynecologist', qualification: 'MD - Obstetrics and Gynecology', experience_years: 14, fee: 900, rating: 4.8, reviews_count: 290, hospital: 'Cloudnine Hospital', city: 'Chennai', availability: ['Mon 12:00-18:00', 'Wed 12:00-18:00', 'Fri 09:00-15:00'], about: "Women's health, fertility consultation, and high-risk pregnancy care.", languages: ['English', 'Tamil'], image_url: 'https://i.pravatar.cc/300?img=25' },
  { name: 'Dr. Arjun Patel', specialty: 'General Physician', qualification: 'MBBS, MD - General Medicine', experience_years: 8, fee: 500, rating: 4.6, reviews_count: 150, hospital: 'City Care Hospital', city: 'Ahmedabad', availability: ['Mon-Sat 10:00-19:00'], about: 'General physician treating fever, infections, diabetes, and lifestyle diseases.', languages: ['English', 'Gujarati', 'Hindi'], image_url: 'https://i.pravatar.cc/300?img=14' },
  { name: 'Dr. Sneha Reddy', specialty: 'Psychiatrist', qualification: 'MD - Psychiatry', experience_years: 11, fee: 1100, rating: 4.7, reviews_count: 95, hospital: 'MindWell Center', city: 'Hyderabad', availability: ['Mon 14:00-20:00', 'Wed 14:00-20:00', 'Fri 10:00-14:00'], about: 'Mental health specialist treating anxiety, depression, and stress disorders.', languages: ['English', 'Telugu'], image_url: 'https://i.pravatar.cc/300?img=68' },
  { name: 'Dr. Karthik Menon', specialty: 'Neurologist', qualification: 'DM - Neurology, MD, MBBS', experience_years: 20, fee: 1800, rating: 4.9, reviews_count: 230, hospital: 'NIMHANS', city: 'Bangalore', availability: ['Tue 10:00-15:00', 'Thu 10:00-15:00'], about: 'Neurologist treating epilepsy, stroke, migraine, and movement disorders.', languages: ['English', 'Kannada', 'Malayalam'], image_url: 'https://i.pravatar.cc/300?img=52' },
  { name: 'Dr. Anjali Gupta', specialty: 'ENT Specialist', qualification: 'MS - ENT', experience_years: 9, fee: 700, rating: 4.5, reviews_count: 120, hospital: 'ENT Care Hospital', city: 'Lucknow', availability: ['Mon-Sat 11:00-17:00'], about: 'ENT surgeon for hearing loss, sinus issues, and throat conditions.', languages: ['English', 'Hindi'], image_url: 'https://i.pravatar.cc/300?img=65' },
  { name: 'Dr. Rohit Desai', specialty: 'Diabetologist', qualification: 'MD - Medicine, Fellowship Diabetes', experience_years: 13, fee: 850, rating: 4.8, reviews_count: 175, hospital: 'Diabetes Care Center', city: 'Pune', availability: ['Mon 10:00-16:00', 'Wed 10:00-16:00', 'Fri 10:00-16:00'], about: 'Diabetes management, insulin therapy, and lifestyle counseling.', languages: ['English', 'Marathi', 'Hindi'], image_url: 'https://i.pravatar.cc/300?img=41' },
  { name: 'Dr. Fatima Khan', specialty: 'Ophthalmologist', qualification: 'MS - Ophthalmology', experience_years: 10, fee: 650, rating: 4.6, reviews_count: 88, hospital: 'Vision Eye Hospital', city: 'Hyderabad', availability: ['Tue 10:00-15:00', 'Thu 10:00-15:00', 'Sat 10:00-14:00'], about: 'Eye surgeon specializing in cataract, LASIK, and retinal disorders.', languages: ['English', 'Urdu', 'Telugu'], image_url: 'https://i.pravatar.cc/300?img=5' },
  { name: 'Dr. Sanjay Verma', specialty: 'Gastroenterologist', qualification: 'DM - Gastroenterology, MD, MBBS', experience_years: 16, fee: 1300, rating: 4.7, reviews_count: 140, hospital: 'Gastro Care Hospital', city: 'Kolkata', availability: ['Mon 11:00-17:00', 'Wed 11:00-17:00'], about: 'GI specialist for liver disease, IBS, and endoscopic procedures.', languages: ['English', 'Bengali', 'Hindi'], image_url: 'https://i.pravatar.cc/300?img=60' },
]

const medicines = [
  { name: 'Paracetamol 500mg', brand: 'Crocin', category: 'Pain Relief', price: 35, mrp: 40, prescription_required: false, in_stock: true, description: 'Used to treat mild to moderate pain and reduce fever.', pack_size: 'Strip of 15 tablets' },
  { name: 'Ibuprofen 400mg', brand: 'Brufen', category: 'Pain Relief', price: 55, mrp: 65, prescription_required: false, in_stock: true, description: 'NSAID for inflammation, pain, and fever.', pack_size: 'Strip of 15 tablets' },
  { name: 'Azithromycin 500mg', brand: 'Azithral', category: 'Antibiotic', price: 120, mrp: 150, prescription_required: true, in_stock: true, description: 'Antibiotic for bacterial infections like respiratory and skin infections.', pack_size: 'Strip of 3 tablets' },
  { name: 'Metformin 500mg', brand: 'Glycomet', category: 'Diabetes', price: 45, mrp: 55, prescription_required: true, in_stock: true, description: 'First-line medication for type 2 diabetes management.', pack_size: 'Strip of 20 tablets' },
  { name: 'Amlodipine 5mg', brand: 'Amlong', category: 'Cardiac', price: 80, mrp: 95, prescription_required: true, in_stock: true, description: 'Calcium channel blocker for high blood pressure.', pack_size: 'Strip of 10 tablets' },
  { name: 'Pantoprazole 40mg', brand: 'Pantocid', category: 'Gastric', price: 110, mrp: 130, prescription_required: false, in_stock: true, description: 'Proton pump inhibitor for acid reflux and ulcers.', pack_size: 'Strip of 15 tablets' },
  { name: 'Cetirizine 10mg', brand: 'Cetzine', category: 'Allergy', price: 25, mrp: 30, prescription_required: false, in_stock: true, description: 'Antihistamine for allergic rhinitis and skin allergies.', pack_size: 'Strip of 10 tablets' },
  { name: 'Vitamin D3 60K', brand: 'D-Rise', category: 'Supplements', price: 95, mrp: 120, prescription_required: false, in_stock: true, description: 'Weekly vitamin D3 supplement for deficiency.', pack_size: 'Strip of 4 capsules' },
  { name: 'Insulin Glargine', brand: 'Lantus', category: 'Diabetes', price: 950, mrp: 1100, prescription_required: true, in_stock: true, description: 'Long-acting insulin for diabetes management.', pack_size: 'Vial 10ml' },
  { name: 'Amoxicillin 500mg', brand: 'Mox', category: 'Antibiotic', price: 85, mrp: 100, prescription_required: true, in_stock: true, description: 'Penicillin antibiotic for bacterial infections.', pack_size: 'Strip of 10 capsules' },
  { name: 'Ondansetron 4mg', brand: 'Vomikind', category: 'Gastric', price: 40, mrp: 50, prescription_required: false, in_stock: true, description: 'Anti-nausea medication for vomiting and nausea.', pack_size: 'Strip of 10 tablets' },
  { name: 'Atorvastatin 10mg', brand: 'Atorva', category: 'Cardiac', price: 140, mrp: 165, prescription_required: true, in_stock: false, description: 'Statin for lowering cholesterol levels.', pack_size: 'Strip of 15 tablets' },
  { name: 'Levocetirizine 5mg', brand: 'Xyzal', category: 'Allergy', price: 60, mrp: 75, prescription_required: false, in_stock: true, description: 'Non-drowsy antihistamine for allergies.', pack_size: 'Strip of 10 tablets' },
  { name: 'Ranitidine 150mg', brand: 'Aciloc', category: 'Gastric', price: 30, mrp: 38, prescription_required: false, in_stock: true, description: 'H2 blocker for acidity and heartburn.', pack_size: 'Strip of 20 tablets' },
  { name: 'Calcium + Vitamin D3', brand: 'Shelcal', category: 'Supplements', price: 110, mrp: 130, prescription_required: false, in_stock: true, description: 'Calcium and vitamin D3 supplement for bone health.', pack_size: 'Strip of 15 tablets' },
  { name: 'Cough Syrup', brand: 'Benadryl', category: 'Cold and Cough', price: 95, mrp: 110, prescription_required: false, in_stock: true, description: 'Cough suppressant and expectorant syrup.', pack_size: 'Bottle 100ml' },
  { name: 'Multivitamin', brand: 'Revital H', category: 'Supplements', price: 450, mrp: 500, prescription_required: false, in_stock: true, description: 'Daily multivitamin with ginseng for energy.', pack_size: 'Bottle 30 capsules' },
  { name: 'Diclofenac Gel', brand: 'Volini', category: 'Pain Relief', price: 120, mrp: 145, prescription_required: false, in_stock: true, description: 'Topical pain relief gel for muscle and joint pain.', pack_size: 'Tube 30g' },
  { name: 'Salbutamol Inhaler', brand: 'Asthalin', category: 'Respiratory', price: 180, mrp: 210, prescription_required: true, in_stock: true, description: 'Bronchodilator inhaler for asthma relief.', pack_size: 'Inhaler 200md' },
  { name: 'Iron + Folic Acid', brand: 'Autrin', category: 'Supplements', price: 85, mrp: 100, prescription_required: false, in_stock: true, description: 'Iron and folic acid supplement for anemia.', pack_size: 'Strip of 15 capsules' },
]

const labTests = [
  { name: 'Complete Blood Count (CBC)', category: 'Hematology', price: 350, mrp: 450, description: 'Measures red and white blood cells, hemoglobin, and platelets.', fasting_required: false, report_time: 'Same day', sample_type: 'Blood' },
  { name: 'Lipid Profile', category: 'Cardiac', price: 650, mrp: 800, description: 'Cholesterol and triglyceride levels for heart health assessment.', fasting_required: true, report_time: '24 hours', sample_type: 'Blood' },
  { name: 'Blood Sugar (Fasting)', category: 'Diabetes', price: 120, mrp: 150, description: 'Fasting blood glucose level for diabetes screening.', fasting_required: true, report_time: 'Same day', sample_type: 'Blood' },
  { name: 'HbA1c', category: 'Diabetes', price: 550, mrp: 700, description: '3-month average blood sugar level for diabetes monitoring.', fasting_required: false, report_time: '24 hours', sample_type: 'Blood' },
  { name: 'Thyroid Profile (T3, T4, TSH)', category: 'Thyroid', price: 500, mrp: 650, description: 'Thyroid hormone levels for thyroid function evaluation.', fasting_required: false, report_time: '24 hours', sample_type: 'Blood' },
  { name: 'Liver Function Test (LFT)', category: 'Liver', price: 600, mrp: 750, description: 'Enzymes and proteins to assess liver health.', fasting_required: true, report_time: '24 hours', sample_type: 'Blood' },
  { name: 'Kidney Function Test (KFT)', category: 'Kidney', price: 550, mrp: 700, description: 'Creatinine, urea, and electrolytes for kidney function.', fasting_required: true, report_time: '24 hours', sample_type: 'Blood' },
  { name: 'Vitamin D', category: 'Vitamins', price: 700, mrp: 900, description: '25-OH Vitamin D level for deficiency detection.', fasting_required: false, report_time: '48 hours', sample_type: 'Blood' },
  { name: 'Vitamin B12', category: 'Vitamins', price: 600, mrp: 750, description: 'Vitamin B12 level for anemia and nerve health.', fasting_required: false, report_time: '24 hours', sample_type: 'Blood' },
  { name: 'Urine Routine', category: 'General', price: 150, mrp: 200, description: 'Routine urine analysis for infections and kidney issues.', fasting_required: false, report_time: 'Same day', sample_type: 'Urine' },
  { name: 'ECG', category: 'Cardiac', price: 400, mrp: 500, description: 'Electrocardiogram to check heart rhythm and function.', fasting_required: false, report_time: 'Same day', sample_type: 'N/A' },
  { name: 'Full Body Health Checkup', category: 'Packages', price: 2999, mrp: 4500, description: 'Comprehensive checkup: CBC, lipid, sugar, thyroid, liver, kidney, vitamin D, ECG.', fasting_required: true, report_time: '48 hours', sample_type: 'Blood + Urine' },
  { name: 'COVID-19 RT-PCR', category: 'Infection', price: 500, mrp: 800, description: 'Nasal/throat swab test for COVID-19 detection.', fasting_required: false, report_time: '24 hours', sample_type: 'Swab' },
  { name: 'Pregnancy Test (Beta hCG)', category: 'Hormones', price: 450, mrp: 600, description: 'Blood test to confirm pregnancy.', fasting_required: false, report_time: 'Same day', sample_type: 'Blood' },
  { name: 'Dengue NS1 Antigen', category: 'Infection', price: 550, mrp: 700, description: 'Early detection of dengue infection.', fasting_required: false, report_time: 'Same day', sample_type: 'Blood' },
]

const symptoms = [
  { symptom: 'Fever', body_part: 'Whole Body', severity: 'mild', possible_conditions: [{ condition: 'Viral Fever', specialty: 'General Physician', urgency: 'low' }, { condition: 'Dengue', specialty: 'General Physician', urgency: 'medium' }, { condition: 'Malaria', specialty: 'General Physician', urgency: 'medium' }, { condition: 'COVID-19', specialty: 'General Physician', urgency: 'medium' }] },
  { symptom: 'Headache', body_part: 'Head', severity: 'mild', possible_conditions: [{ condition: 'Migraine', specialty: 'Neurologist', urgency: 'low' }, { condition: 'Tension Headache', specialty: 'General Physician', urgency: 'low' }, { condition: 'Sinusitis', specialty: 'ENT Specialist', urgency: 'low' }, { condition: 'High BP', specialty: 'Cardiologist', urgency: 'medium' }] },
  { symptom: 'Chest Pain', body_part: 'Chest', severity: 'severe', possible_conditions: [{ condition: 'Angina', specialty: 'Cardiologist', urgency: 'high' }, { condition: 'Heart Attack', specialty: 'Cardiologist', urgency: 'high' }, { condition: 'Acid Reflux', specialty: 'Gastroenterologist', urgency: 'low' }, { condition: 'Muscle Strain', specialty: 'General Physician', urgency: 'low' }] },
  { symptom: 'Cough', body_part: 'Throat', severity: 'mild', possible_conditions: [{ condition: 'Common Cold', specialty: 'General Physician', urgency: 'low' }, { condition: 'Bronchitis', specialty: 'General Physician', urgency: 'low' }, { condition: 'Asthma', specialty: 'General Physician', urgency: 'medium' }, { condition: 'Pneumonia', specialty: 'General Physician', urgency: 'medium' }] },
  { symptom: 'Stomach Pain', body_part: 'Abdomen', severity: 'mild', possible_conditions: [{ condition: 'Gastritis', specialty: 'Gastroenterologist', urgency: 'low' }, { condition: 'Food Poisoning', specialty: 'Gastroenterologist', urgency: 'medium' }, { condition: 'Appendicitis', specialty: 'General Surgeon', urgency: 'high' }, { condition: 'IBS', specialty: 'Gastroenterologist', urgency: 'low' }] },
  { symptom: 'Skin Rash', body_part: 'Skin', severity: 'mild', possible_conditions: [{ condition: 'Allergic Reaction', specialty: 'Dermatologist', urgency: 'low' }, { condition: 'Eczema', specialty: 'Dermatologist', urgency: 'low' }, { condition: 'Fungal Infection', specialty: 'Dermatologist', urgency: 'low' }, { condition: 'Chickenpox', specialty: 'General Physician', urgency: 'medium' }] },
  { symptom: 'Dizziness', body_part: 'Whole Body', severity: 'mild', possible_conditions: [{ condition: 'Low BP', specialty: 'General Physician', urgency: 'low' }, { condition: 'Vertigo', specialty: 'ENT Specialist', urgency: 'low' }, { condition: 'Anemia', specialty: 'General Physician', urgency: 'low' }, { condition: 'Heart Issue', specialty: 'Cardiologist', urgency: 'medium' }] },
  { symptom: 'Joint Pain', body_part: 'Joints', severity: 'mild', possible_conditions: [{ condition: 'Arthritis', specialty: 'Orthopedic Surgeon', urgency: 'low' }, { condition: 'Osteoarthritis', specialty: 'Orthopedic Surgeon', urgency: 'low' }, { condition: 'Gout', specialty: 'Orthopedic Surgeon', urgency: 'low' }, { condition: 'Sprain', specialty: 'Orthopedic Surgeon', urgency: 'low' }] },
  { symptom: 'Sore Throat', body_part: 'Throat', severity: 'mild', possible_conditions: [{ condition: 'Pharyngitis', specialty: 'ENT Specialist', urgency: 'low' }, { condition: 'Tonsillitis', specialty: 'ENT Specialist', urgency: 'low' }, { condition: 'Strep Throat', specialty: 'General Physician', urgency: 'low' }, { condition: 'COVID-19', specialty: 'General Physician', urgency: 'medium' }] },
  { symptom: 'Shortness of Breath', body_part: 'Chest', severity: 'severe', possible_conditions: [{ condition: 'Asthma', specialty: 'General Physician', urgency: 'medium' }, { condition: 'Heart Failure', specialty: 'Cardiologist', urgency: 'high' }, { condition: 'Anxiety', specialty: 'Psychiatrist', urgency: 'low' }, { condition: 'Pneumonia', specialty: 'General Physician', urgency: 'medium' }] },
]

const hospitals = [
  { name: 'Apollo Hospital', type: 'hospital', address: 'Greams Road, Chennai', city: 'Chennai', phone: '+91-44-28293333', emergency: true, open_24x7: true, rating: 4.6, services: ['Emergency', 'Cardiology', 'Neurology', 'Oncology', 'Pediatrics'] },
  { name: 'Fortis Hospital', type: 'hospital', address: 'Sector 62, Mohali', city: 'Mohali', phone: '+91-172-5055555', emergency: true, open_24x7: true, rating: 4.5, services: ['Emergency', 'Orthopedics', 'Cardiology', 'Gastroenterology'] },
  { name: 'AIIMS', type: 'hospital', address: 'Ansari Nagar, New Delhi', city: 'Delhi', phone: '+91-11-26588500', emergency: true, open_24x7: true, rating: 4.7, services: ['Emergency', 'All Specialties', 'Trauma', 'Transplant'] },
  { name: 'Max Super Speciality', type: 'hospital', address: 'Saket, New Delhi', city: 'Delhi', phone: '+91-11-26515050', emergency: true, open_24x7: true, rating: 4.5, services: ['Emergency', 'Cardiology', 'Cancer Care', 'Neurology'] },
  { name: 'Narayana Health', type: 'hospital', address: 'Bommasandra, Bangalore', city: 'Bangalore', phone: '+91-80-71222222', emergency: true, open_24x7: true, rating: 4.4, services: ['Emergency', 'Cardiac Surgery', 'Nephrology', 'Pediatrics'] },
  { name: 'Manipal Hospital', type: 'hospital', address: 'Old Airport Road, Bangalore', city: 'Bangalore', phone: '+91-80-25024444', emergency: true, open_24x7: true, rating: 4.5, services: ['Emergency', 'Oncology', 'Neurology', 'Transplant'] },
  { name: 'Lilavati Hospital', type: 'hospital', address: 'Bandra, Mumbai', city: 'Mumbai', phone: '+91-22-26751000', emergency: true, open_24x7: true, rating: 4.4, services: ['Emergency', 'Cardiology', 'Orthopedics', 'IVF'] },
  { name: 'Kokilaben Hospital', type: 'hospital', address: 'Andheri, Mumbai', city: 'Mumbai', phone: '+91-22-42696969', emergency: true, open_24x7: true, rating: 4.5, services: ['Emergency', 'Cancer Care', 'Neuroscience', 'Transplant'] },
  { name: 'Ruby Hall Clinic', type: 'hospital', address: 'Sassoon Road, Pune', city: 'Pune', phone: '+91-20-66455100', emergency: true, open_24x7: true, rating: 4.3, services: ['Emergency', 'Cardiology', 'Trauma', 'Oncology'] },
  { name: 'Medanta Hospital', type: 'hospital', address: 'Sector 38, Gurugram', city: 'Gurugram', phone: '+91-124-4141414', emergency: true, open_24x7: true, rating: 4.6, services: ['Emergency', 'Cardiac Surgery', 'Neurology', 'Transplant'] },
  { name: 'City Emergency Clinic', type: 'emergency', address: 'MG Road, Pune', city: 'Pune', phone: '+91-20-26123456', emergency: true, open_24x7: true, rating: 4.0, services: ['Emergency', 'Trauma', 'Ambulance'] },
  { name: 'QuickMed 24x7', type: 'clinic', address: 'Banjara Hills, Hyderabad', city: 'Hyderabad', phone: '+91-40-23334567', emergency: false, open_24x7: true, rating: 4.1, services: ['General OPD', 'Pharmacy', 'Diagnostics'] },
]

const articles = [
  { title: '10 Foods That Boost Your Immune System', category: 'Nutrition', excerpt: 'Discover everyday foods that can strengthen your immunity naturally.', content: 'A strong immune system is your best defense against infections. Here are 10 foods you should add to your diet: 1. Citrus fruits - rich in vitamin C. 2. Red bell peppers - 3x more vitamin C than oranges. 3. Broccoli - vitamins A, C, and E. 4. Garlic - immune-boosting allicin. 5. Ginger - reduces inflammation. 6. Spinach - antioxidants and beta-carotene. 7. Yogurt - probiotics for gut health. 8. Almonds - vitamin E. 9. Turmeric - anti-inflammatory curcumin. 10. Green tea - flavonoid antioxidants. Incorporate these into your daily meals for better health.', author: 'Dr. Arjun Patel', read_time: '5 min' },
  { title: 'Understanding Blood Pressure: What the Numbers Mean', category: 'Heart Health', excerpt: 'A simple guide to reading your blood pressure and knowing when to act.', content: 'Blood pressure is measured as two numbers: systolic (top) and diastolic (bottom). Normal: Below 120/80 mmHg. Elevated: 120-129/80 mmHg. Stage 1 Hypertension: 130-139/80-89 mmHg. Stage 2 Hypertension: 140+/90+ mmHg. Hypertensive Crisis: 180+/120+ mmHg - seek emergency care. Tips to manage BP: Reduce sodium intake, exercise regularly, maintain healthy weight, limit alcohol, manage stress, monitor regularly at home.', author: 'Dr. Aanya Sharma', read_time: '4 min' },
  { title: 'How Much Water Should You Really Drink Daily?', category: 'Wellness', excerpt: 'The truth about daily water intake and hydration myths debunked.', content: 'The 8 glasses a day rule is a good starting point, but your actual needs depend on several factors: Body weight (~30-35ml per kg), activity level (+500ml per hour of exercise), climate (hot/humid increases needs), health conditions (fever, diarrhea increase requirements). Signs of good hydration: pale yellow urine, no thirst, good energy. Signs of dehydration: dark urine, headache, dizziness, dry mouth. Best practice: sip water throughout the day.', author: 'Dr. Meera Iyer', read_time: '3 min' },
  { title: 'Managing Diabetes: A Lifestyle Guide', category: 'Diabetes', excerpt: 'Practical tips for controlling blood sugar through diet and exercise.', content: 'Type 2 diabetes is largely manageable through lifestyle changes. Diet: choose whole grains, include fiber-rich vegetables, limit sugary drinks, eat at regular intervals, control portions. Exercise: aim for 150 minutes of moderate activity weekly, walk after meals, include strength training 2x/week. Monitoring: check fasting and post-meal sugar regularly, get HbA1c every 3 months, keep a log. Medication: take prescribed medicines on time, never skip doses, discuss side effects with your doctor.', author: 'Dr. Rohit Desai', read_time: '6 min' },
  { title: 'Mental Health: 7 Daily Habits That Help', category: 'Mental Health', excerpt: 'Simple daily practices to protect and improve your mental wellbeing.', content: 'Mental health is just as important as physical health. Try these daily habits: 1. Practice gratitude - write 3 things you are thankful for. 2. Stay active - even 20 minutes of walking helps. 3. Sleep 7-9 hours - consistent schedule. 4. Connect with others - call a friend. 5. Limit screen time - especially before bed. 6. Practice deep breathing - 5 minutes daily. 7. Seek help when needed - therapy is for everyone. Remember: persistent sadness, anxiety, or loss of interest for 2+ weeks may indicate depression - reach out to a professional.', author: 'Dr. Sneha Reddy', read_time: '5 min' },
  { title: 'Child Vaccination Schedule: 0-5 Years', category: 'Pediatrics', excerpt: "A complete immunization timeline for your child's first 5 years.", content: 'Vaccinations protect your child from serious diseases. Follow this schedule: At Birth: BCG, OPV-0, Hep-B-1. 6 Weeks: DTaP-1, OPV-1, IPV-1, Hep-B-2, Hib-1, Rotavirus-1, PCV-1. 10 Weeks: DTaP-2, OPV-2, IPV-2, Hib-2, Rotavirus-2, PCV-2. 14 Weeks: DTaP-3, OPV-3, IPV-3, Hib-3, Rotavirus-3, PCV-3. 6 Months: Influenza. 9 Months: MMR-1, Typhoid. 12 Months: Hep-A-1. 15 Months: MMR-2, Varicella-1, PCV booster. 18 Months: DTaP booster, IPV booster, Hib booster, Hep-A-2. 4-5 Years: DTaP booster, OPV, MMR-3, Varicella-2. Never skip vaccines. Consult your pediatrician if you miss a dose.', author: 'Dr. Priya Nair', read_time: '7 min' },
]

async function seedCatalog() {
  for (const [Model, rows, label] of [
    [Doctor, doctors, 'doctors'],
    [Medicine, medicines, 'medicines'],
    [LabTest, labTests, 'lab tests'],
    [Symptom, symptoms, 'symptoms'],
    [Hospital, hospitals, 'hospitals'],
    [Article, articles, 'articles'],
  ]) {
    const count = await Model.countDocuments()
    if (count > 0) {
      console.log(`Skipping ${label} (already has ${count} documents)`)
      continue
    }
    await Model.insertMany(rows)
    console.log(`Inserted ${rows.length} ${label}`)
  }
}

// Runs standalone via `npm run seed` (connects to Mongo itself, then exits).
// Also imported and reused by index.js so a fresh database is auto-populated
// on server startup - no manual step required.
async function runStandalone() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env')
    process.exit(1)
  }
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected. Seeding...')
  await seedCatalog()
  console.log('Done.')
  await mongoose.disconnect()
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  runStandalone().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

export { seedCatalog }
