import type {
  Appointment,
  ClinicConfig,
  Doctor,
  Invoice,
  Patient,
  Specialty,
} from "./types";

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const initialClinic: ClinicConfig = {
  name: "Clinica MediOS Demo",
  address: "Av. Reforma 500, Col. Centro, Ciudad de Mexico",
  phone: "+52 55 1234 5678",
  email: "contacto@medios.demo",
  openTime: "09:00",
  closeTime: "19:00",
};

export const initialSpecialties: Specialty[] = [
  { id: "spe_01", name: "Medicina General", duration: 30, price: 800, description: "Consulta general y diagnostico", icon: "Stethoscope" },
  { id: "spe_02", name: "Odontologia", duration: 45, price: 1200, description: "Salud dental integral", icon: "SmilePlus" },
  { id: "spe_03", name: "Pediatria", duration: 30, price: 900, description: "Atencion para ninos y adolescentes", icon: "Baby" },
  { id: "spe_04", name: "Dermatologia", duration: 30, price: 1000, description: "Cuidado de la piel", icon: "Scan" },
  { id: "spe_05", name: "Nutricion", duration: 45, price: 700, description: "Planes alimenticios personalizados", icon: "Apple" },
];

export const initialDoctors: Doctor[] = [
  {
    id: "doc_01",
    name: "Dra. Sofia Martinez",
    specialtyId: "spe_01",
    photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop",
    schedule: { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" },
    active: true,
    bio: "10 anos de experiencia en medicina interna.",
  },
  {
    id: "doc_02",
    name: "Dr. Carlos Herrera",
    specialtyId: "spe_02",
    photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop",
    schedule: { days: [1, 2, 3, 4, 5], start: "10:00", end: "18:00" },
    active: true,
    bio: "Especialista en odontologia estetica y restaurativa.",
  },
  {
    id: "doc_03",
    name: "Dra. Ana Lopez",
    specialtyId: "spe_03",
    photo: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop",
    schedule: { days: [1, 2, 4], start: "09:00", end: "14:00" },
    active: true,
    bio: "Pediatra certificada con enfoque en desarrollo infantil.",
  },
  {
    id: "doc_04",
    name: "Dr. Roberto Diaz",
    specialtyId: "spe_04",
    photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop",
    schedule: { days: [2, 4, 5], start: "11:00", end: "19:00" },
    active: true,
    bio: "Dermatologo clinico y estetico.",
  },
];

export const initialPatients: Patient[] = [
  { id: "pac_01", name: "Maria Garcia", phone: "5512345001", email: "maria@demo.com", birthDate: "1989-05-12" },
  { id: "pac_02", name: "Juan Rodriguez", phone: "5512345002", email: "juan@demo.com", birthDate: "1996-09-23" },
  { id: "pac_03", name: "Laura Sanchez", phone: "5512345003", email: "laura@demo.com", birthDate: "1982-02-04" },
  { id: "pac_04", name: "Pedro Gonzalez", phone: "5512345004", email: "pedro@demo.com", birthDate: "1969-11-30" },
  { id: "pac_05", name: "Ana Torres", phone: "5512345005", email: "ana@demo.com", birthDate: "2016-07-08" },
];

const ev = (type: string, daysOffset = 0): { type: string; timestamp: string } => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return { type, timestamp: d.toISOString() };
};

export const initialAppointments: Appointment[] = [
  // 3 scheduled
  { id: "apt_01", patientId: "pac_02", doctorId: "doc_01", specialtyId: "spe_01", date: addDays(1), time: "10:00", duration: 30, status: "scheduled", reason: "Dolor de cabeza recurrente", clinicalNotes: "", events: [ev("created", -1)] },
  { id: "apt_02", patientId: "pac_03", doctorId: "doc_02", specialtyId: "spe_02", date: addDays(2), time: "11:30", duration: 45, status: "scheduled", reason: "Limpieza dental", clinicalNotes: "", events: [ev("created", -1)] },
  { id: "apt_03", patientId: "pac_05", doctorId: "doc_03", specialtyId: "spe_03", date: addDays(3), time: "09:30", duration: 30, status: "scheduled", reason: "Control mensual", clinicalNotes: "", events: [ev("created", 0)] },
  // 2 confirmed (today)
  { id: "apt_04", patientId: "pac_04", doctorId: "doc_04", specialtyId: "spe_04", date: addDays(0), time: "15:00", duration: 30, status: "confirmed", reason: "Manchas en la piel", clinicalNotes: "", events: [ev("created", -2), ev("confirmed", -1)] },
  { id: "apt_05", patientId: "pac_03", doctorId: "doc_01", specialtyId: "spe_01", date: addDays(0), time: "16:30", duration: 30, status: "confirmed", reason: "Revision general", clinicalNotes: "", events: [ev("created", -2), ev("confirmed", 0)] },
  // 2 completed
  { id: "apt_06", patientId: "pac_01", doctorId: "doc_01", specialtyId: "spe_01", date: addDays(-3), time: "10:00", duration: 30, status: "completed", reason: "Gripa fuerte", clinicalNotes: "Paciente con cuadro gripal. Indicado paracetamol 500mg cada 8h por 5 dias.", events: [ev("created", -5), ev("completed", -3)] },
  { id: "apt_07", patientId: "pac_04", doctorId: "doc_02", specialtyId: "spe_02", date: addDays(-7), time: "12:00", duration: 45, status: "completed", reason: "Caries molar", clinicalNotes: "Restauracion de molar inferior. Control en 6 meses.", events: [ev("created", -10), ev("completed", -7)] },
  // 1 in_progress (now)
  { id: "apt_08", patientId: "pac_01", doctorId: "doc_01", specialtyId: "spe_01", date: addDays(0), time: nowTime(), duration: 30, status: "in_progress", reason: "Seguimiento", clinicalNotes: "", events: [ev("created", -1), ev("in_progress", 0)] },
  // 1 no_show
  { id: "apt_09", patientId: "pac_02", doctorId: "doc_04", specialtyId: "spe_04", date: addDays(-1), time: "13:00", duration: 30, status: "no_show", reason: "Acne", clinicalNotes: "", events: [ev("created", -3), ev("no_show", -1)] },
  // 1 cancelled
  { id: "apt_10", patientId: "pac_03", doctorId: "doc_03", specialtyId: "spe_03", date: addDays(-2), time: "09:00", duration: 30, status: "cancelled", reason: "Consulta", clinicalNotes: "", events: [ev("created", -4), ev("cancelled", -2)] },
];

export const initialInvoices: Invoice[] = [
  { id: "inv_01", appointmentId: "apt_06", patientId: "pac_01", amount: 800, status: "paid", method: "efectivo", paidAt: addDays(-3), notes: "", createdAt: addDays(-3) },
  { id: "inv_02", appointmentId: "apt_07", patientId: "pac_04", amount: 1200, status: "paid", method: "tarjeta", paidAt: addDays(-7), notes: "", createdAt: addDays(-7) },
  { id: "inv_03", appointmentId: "apt_06", patientId: "pac_01", amount: 200, status: "pending", method: null, paidAt: null, notes: "Saldo pendiente medicamento", createdAt: addDays(-3) },
];
