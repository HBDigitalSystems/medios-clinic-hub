import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ui/image-upload";
import { useUpdateDoctor } from "@/lib/api/doctors";
import { useUpdatePatient } from "@/lib/api/patients";
import type { Doctor, Patient } from "@/lib/api/types";

/**
 * Perfil propio del doctor.
 *
 * Solo foto y bio: nombre, horario y estado activo los decide la clinica,
 * y el trigger `guard_doctor_self_update` los rechaza si se intentan
 * cambiar desde aqui.
 */
export function MiPerfilDoctor({ doctor, onClose }: { doctor: Doctor; onClose: () => void }) {
  const actualizar = useUpdateDoctor();
  const [photo, setPhoto] = useState<string | null>(doctor.photo || null);
  const [bio, setBio] = useState(doctor.bio);

  const guardar = async () => {
    try {
      await actualizar.mutateAsync({ id: doctor.id, patch: { photo: photo ?? "", bio } });
      toast.success("Perfil actualizado");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mi perfil</DialogTitle>
          <DialogDescription>
            Tu horario y especialidad los gestiona la clinica.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <ImageUpload
            value={photo}
            onChange={setPhoto}
            carpeta="doctors"
            entidadId={doctor.id}
            nombre={doctor.name}
            etiqueta="Mi foto"
          />
          <div className="rounded-xl bg-accent/30 p-3 text-sm">
            <p className="font-medium">{doctor.name}</p>
            <p className="text-xs text-muted-foreground">
              {doctor.schedule.start} - {doctor.schedule.end}
            </p>
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={actualizar.isPending}>
            {actualizar.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Perfil propio del paciente: foto y datos de contacto. */
export function MiPerfilPaciente({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const actualizar = useUpdatePatient();
  const [photo, setPhoto] = useState<string | null>(patient.photo);
  const [name, setName] = useState(patient.name);
  const [phone, setPhone] = useState(patient.phone);
  const [email, setEmail] = useState(patient.email);
  const [birthDate, setBirthDate] = useState(patient.birthDate ?? "");

  const guardar = async () => {
    if (!name.trim()) { toast.error("El nombre no puede quedar vacio"); return; }
    try {
      await actualizar.mutateAsync({
        id: patient.id,
        patch: { photo, name, phone, email, birthDate: birthDate || null },
      });
      toast.success("Perfil actualizado");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Mi perfil</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <ImageUpload
            value={photo}
            onChange={setPhoto}
            carpeta="patients"
            entidadId={patient.id}
            nombre={name}
            etiqueta="Mi foto"
          />
          <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><Label>Nacimiento</Label><Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></div>
          </div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={actualizar.isPending}>
            {actualizar.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
