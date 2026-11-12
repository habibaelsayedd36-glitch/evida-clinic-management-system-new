"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Link2, Megaphone, Save, UserCog, UserPlus } from "lucide-react";
import { api, toLocalInput } from "@/lib/client";
import {
  APPOINTMENT_KINDS,
  APPOINTMENT_STATUSES,
  KIND_LABELS,
  STATUS_LABELS,
  type AppointmentDTO,
  type AssignmentDTO,
  type ProfileDTO,
} from "@/lib/types";
import { Button, Field, Input, Modal, Select, Textarea, useToast } from "./ui";

export function useSubmit(onDone: () => Promise<void> | void) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await fn();
      toast.push(success, "success");
      await onDone();
      return true;
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Something went wrong", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, run, toast };
}

function useSynced<T>(initial: T, open: boolean) {
  const [state, setState] = useState<T>(initial);
  useEffect(() => {
    if (open) setState(initial);
  }, [initial, open]);
  return [state, setState] as const;
}

const emptyClient = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  gender: "female",
  birthDate: "",
  heightCm: "",
  weightKg: "",
  targetWeightKg: "",
  bloodType: "",
  allergies: "",
  medicalNotes: "",
  doctorId: "",
  assignmentNote: "",
};

export function ClientForm({
  open,
  onClose,
  onDone,
  doctors,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  doctors: ProfileDTO[];
  initial?: ProfileDTO | null;
}) {
  const [form, setForm] = useSynced(
    initial
      ? {
          ...emptyClient,
          fullName: initial.fullName,
          email: initial.email,
          phone: initial.phone ?? "",
          gender: initial.gender ?? "female",
          birthDate: initial.birthDate ?? "",
          heightCm: initial.heightCm?.toString() ?? "",
          weightKg: initial.weightKg?.toString() ?? "",
          targetWeightKg: initial.targetWeightKg?.toString() ?? "",
          bloodType: initial.bloodType ?? "",
          allergies: initial.allergies ?? "",
          medicalNotes: initial.medicalNotes ?? "",
        }
      : emptyClient,
    open,
  );
  const { busy, run } = useSubmit(onDone);
  const set =
    (key: keyof typeof emptyClient) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function submit() {
    const payload = { ...form };
    const done = initial
      ? await run(() => api("PATCH", `/api/clients/${initial.id}`, payload), "Client updated")
      : await run(() => api("POST", "/api/clients", payload), "Client added to the system");
    if (done) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={initial ? `Edit ${initial.fullName}` : "Add a new client"}
      subtitle={
        initial
          ? "Update personal and clinical details"
          : "Account details plus an optional link to the responsible doctor"
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} icon={<Save className="h-4 w-4" />} type="button">
            {initial ? "Save changes" : "Add client"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input value={form.fullName} onChange={set("fullName")} placeholder="e.g. Mona Abdelrahman" />
        </Field>
        <Field label="Email">
          <Input value={form.email} onChange={set("email")} type="email" placeholder="name@evida.clinic" />
        </Field>
        <Field
          label={initial ? "New password" : "Password"}
          hint={initial ? "Leave empty to keep the current one" : "At least 8 characters — defaults to Evida@123"}
        >
          <Input value={form.password} onChange={set("password")} type="text" />
        </Field>
        <Field label="Phone number">
          <Input value={form.phone} onChange={set("phone")} placeholder="01xxxxxxxxx" />
        </Field>
        <Field label="Gender">
          <Select value={form.gender} onChange={set("gender")}>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </Select>
        </Field>
        <Field label="Date of birth">
          <Input value={form.birthDate} onChange={set("birthDate")} type="date" />
        </Field>
        <Field label="Height (cm)">
          <Input value={form.heightCm} onChange={set("heightCm")} type="number" />
        </Field>
        <Field label="Current weight (kg)">
          <Input value={form.weightKg} onChange={set("weightKg")} type="number" step="0.1" />
        </Field>
        <Field label="Target weight (kg)">
          <Input value={form.targetWeightKg} onChange={set("targetWeightKg")} type="number" step="0.1" />
        </Field>
        <Field label="Blood type">
          <Input value={form.bloodType} onChange={set("bloodType")} placeholder="O+" />
        </Field>
        <Field label="Allergies" className="sm:col-span-2">
          <Input value={form.allergies} onChange={set("allergies")} placeholder="e.g. Lactose intolerant" />
        </Field>
        <Field label="Medical notes" className="sm:col-span-2">
          <Textarea
            value={form.medicalNotes}
            onChange={set("medicalNotes")}
            placeholder="Chronic conditions, ongoing medication, family history…"
          />
        </Field>

        {!initial ? (
          <>
            <Field label="Responsible doctor (optional)">
              <Select value={form.doctorId} onChange={set("doctorId")}>
                <option value="">Do not link yet</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} — {d.specialization ?? "No specialty"}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Assignment note">
              <Input value={form.assignmentNote} onChange={set("assignmentNote")} placeholder="e.g. Weight-loss programme" />
            </Field>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

const emptyStaff = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  gender: "female",
  specialization: "",
  licenseNumber: "",
  bio: "",
};

export function StaffForm({
  open,
  onClose,
  onDone,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  initial?: ProfileDTO | null;
}) {
  const [form, setForm] = useSynced(
    initial
      ? {
          ...emptyStaff,
          fullName: initial.fullName,
          email: initial.email,
          phone: initial.phone ?? "",
          gender: initial.gender ?? "female",
          specialization: initial.specialization ?? "",
          licenseNumber: initial.licenseNumber ?? "",
          bio: initial.bio ?? "",
        }
      : emptyStaff,
    open,
  );
  const { busy, run } = useSubmit(onDone);
  const set =
    (key: keyof typeof emptyStaff) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function submit() {
    const done = initial
      ? await run(() => api("PATCH", `/api/doctors/${initial.id}`, form), "Doctor updated")
      : await run(() => api("POST", "/api/doctors", { ...form, role: "doctor" }), "Doctor added to the team");
    if (done) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? `Edit ${initial.fullName}` : "Add a doctor to the team"}
      subtitle="Staff accounts can only be created by the admin"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} icon={<UserPlus className="h-4 w-4" />} type="button">
            {initial ? "Save" : "Add"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input value={form.fullName} onChange={set("fullName")} placeholder="Dr. Omnia" />
        </Field>
        <Field label="Email">
          <Input value={form.email} onChange={set("email")} type="email" />
        </Field>
        <Field label={initial ? "New password (optional)" : "Password"}>
          <Input value={form.password} onChange={set("password")} />
        </Field>
        <Field label="Phone number">
          <Input value={form.phone} onChange={set("phone")} />
        </Field>
        <Field label="Specialty">
          <Input value={form.specialization} onChange={set("specialization")} placeholder="Clinical nutrition" />
        </Field>
        <Field label="License number">
          <Input value={form.licenseNumber} onChange={set("licenseNumber")} />
        </Field>
        <Field label="Gender">
          <Select value={form.gender} onChange={set("gender")}>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </Select>
        </Field>
        <Field label="Bio" className="sm:col-span-2">
          <Textarea value={form.bio} onChange={set("bio")} />
        </Field>
      </div>
    </Modal>
  );
}

export function AppointmentForm({
  open,
  onClose,
  onDone,
  clients,
  doctors,
  initial,
  lockClientId,
  canPickDoctor = true,
  canSetStatus = true,
  defaultDoctorId,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  clients: ProfileDTO[];
  doctors: ProfileDTO[];
  initial?: AppointmentDTO | null;
  lockClientId?: string;
  canPickDoctor?: boolean;
  canSetStatus?: boolean;
  defaultDoctorId?: string;
}) {
  const [form, setForm] = useSynced(
    {
      clientId: initial?.clientId ?? lockClientId ?? "",
      doctorId: initial?.doctorId ?? defaultDoctorId ?? "",
      scheduledAt: initial ? toLocalInput(initial.scheduledAt) : toLocalInput(),
      durationMin: String(initial?.durationMin ?? 30),
      kind: initial?.kind ?? "consultation",
      status: initial?.status ?? "scheduled",
      location: initial?.location ?? "EVIDA Clinic — New Cairo, GOE Medical Park Mall 3",
      price: initial?.price?.toString() ?? "",
      notes: initial?.notes ?? "",
    },
    open,
  );
  const { busy, run } = useSubmit(onDone);

  async function submit() {
    const payload = {
      ...form,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      durationMin: Number(form.durationMin),
      price: form.price ? Number(form.price) : null,
    };
    const done = initial
      ? await run(() => api("PATCH", `/api/appointments/${initial.id}`, payload), "Appointment updated")
      : await run(() => api("POST", "/api/appointments", payload), "Appointment booked");
    if (done) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit appointment" : "Book a new appointment"}
      subtitle="Saved to the database and both sides get a notification"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} icon={<CalendarPlus className="h-4 w-4" />} type="button">
            {initial ? "Save changes" : "Confirm booking"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client" className={lockClientId ? "sm:col-span-2" : ""}>
          <Select
            value={form.clientId}
            disabled={Boolean(lockClientId)}
            onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}
          >
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} — {c.phone ?? "No phone"}
              </option>
            ))}
          </Select>
        </Field>

        {!lockClientId && canPickDoctor ? (
          <Field label="Doctor">
            <Select value={form.doctorId} onChange={(e) => setForm((p) => ({ ...p, doctorId: e.target.value }))}>
              <option value="">Use the responsible doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field label="Date & time">
          <Input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
          />
        </Field>
        <Field label="Duration (minutes)">
          <Input
            type="number"
            value={form.durationMin}
            onChange={(e) => setForm((p) => ({ ...p, durationMin: e.target.value }))}
          />
        </Field>
        <Field label="Visit type">
          <Select value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}>
            {APPOINTMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
        {canSetStatus ? (
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              {APPOINTMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Location">
          <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
        </Field>
        {canSetStatus ? (
          <Field label="Price (EGP)">
            <Input type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
          </Field>
        ) : null}
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        </Field>
      </div>
    </Modal>
  );
}

export function AssignmentForm({
  open,
  onClose,
  onDone,
  clients,
  doctors,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  clients: ProfileDTO[];
  doctors: ProfileDTO[];
  initial?: { id: string; clientId: string; doctorId: string; note: string | null } | null;
}) {
  const [form, setForm] = useSynced(
    { clientId: initial?.clientId ?? "", doctorId: initial?.doctorId ?? "", note: initial?.note ?? "" },
    open,
  );
  const { busy, run } = useSubmit(onDone);

  async function submit() {
    const isEditing = Boolean(initial?.id);
    const done = isEditing
      ? await run(
          () => api("PATCH", `/api/assignments/${initial.id}`, { doctorId: form.doctorId, note: form.note }),
          "Assignment updated",
        )
      : await run(() => api("POST", "/api/assignments", form), "Client linked to a doctor");
    if (done) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Change the responsible doctor" : "Link a client to a doctor"}
      subtitle="The doctor gets access to this client's data as soon as the link exists"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} icon={<Link2 className="h-4 w-4" />} type="button">
            Save link
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Client">
          <Select
            value={form.clientId}
            disabled={Boolean(initial)}
            onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}
          >
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} — {c.email}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Responsible doctor">
          <Select value={form.doctorId} onChange={(e) => setForm((p) => ({ ...p, doctorId: e.target.value }))}>
            <option value="">Select a doctor…</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} — {d.specialization ?? "No specialty"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note">
          <Input value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
        </Field>
      </div>
    </Modal>
  );
}

export function NotificationForm({
  open,
  onClose,
  onDone,
  clients,
  doctors,
  defaultClientId,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  clients: ProfileDTO[];
  doctors: ProfileDTO[];
  defaultClientId?: string;
}) {
  const [form, setForm] = useSynced(
    { target: defaultClientId ? `client:${defaultClientId}` : "", title: "", body: "", kind: "info" },
    open,
  );
  const { busy, run } = useSubmit(onDone);

  async function submit() {
    const [type, id] = form.target.split(":");
    const payload = {
      title: form.title,
      body: form.body,
      kind: form.kind,
      ...(type === "client" ? { clientId: id } : {}),
      ...(type === "user" ? { userId: id } : {}),
      ...(type === "role" ? { targetRole: id } : {}),
    };
    const done = await run(() => api("POST", "/api/notifications", payload), "Notification sent");
    if (done) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send a notification"
      subtitle="It appears in the recipient's bell immediately"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} icon={<Megaphone className="h-4 w-4" />} type="button">
            Send
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Recipient">
          <Select value={form.target} onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))}>
            <option value="">Select a recipient…</option>
            <option value="role:all-clients">All clients</option>
            <option value="role:all-doctors">All doctors</option>
            <optgroup label="Specific client">
              {clients.map((c) => (
                <option key={c.id} value={`client:${c.id}`}>
                  {c.fullName}
                </option>
              ))}
            </optgroup>
            <optgroup label="Team member">
              {doctors.map((d) => (
                <option key={d.id} value={`user:${d.id}`}>
                  {d.fullName}
                </option>
              ))}
            </optgroup>
          </Select>
        </Field>
        <Field label="Title">
          <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </Field>
        <Field label="Type">
          <Select value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}>
            <option value="info">Info</option>
            <option value="appointment">Appointment</option>
            <option value="medication">Medication</option>
            <option value="diet">Nutrition</option>
            <option value="plan">Treatment plan</option>
            <option value="warning">Warning</option>
          </Select>
        </Field>
        <Field label="Message">
          <Textarea value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} />
        </Field>
      </div>
    </Modal>
  );
}

export function ProfileForm({
  open,
  onClose,
  onDone,
  me,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  me: ProfileDTO;
}) {
  const [form, setForm] = useSynced(
    {
      fullName: me.fullName,
      phone: me.phone ?? "",
      gender: me.gender ?? "",
      birthDate: me.birthDate ?? "",
      heightCm: me.heightCm?.toString() ?? "",
      weightKg: me.weightKg?.toString() ?? "",
      targetWeightKg: me.targetWeightKg?.toString() ?? "",
      bloodType: me.bloodType ?? "",
      allergies: me.allergies ?? "",
      newPassword: "",
    },
    open,
  );
  const { busy, run } = useSubmit(onDone);
  const isClient = me.role === "client";

  async function submit() {
    const done = await run(() => api("PATCH", "/api/profile/me", form), "Profile updated");
    if (done) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit profile"
      subtitle="These changes apply to your own account only"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} icon={<UserCog className="h-4 w-4" />} type="button">
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
        </Field>
        <Field label="Phone number">
          <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
        </Field>
        <Field label="Gender">
          <Select value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}>
            <option value="">—</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </Select>
        </Field>
        <Field label="Date of birth">
          <Input type="date" value={form.birthDate} onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))} />
        </Field>
        {isClient ? (
          <>
            <Field label="Height (cm)">
              <Input type="number" value={form.heightCm} onChange={(e) => setForm((p) => ({ ...p, heightCm: e.target.value }))} />
            </Field>
            <Field label="Current weight (kg)">
              <Input type="number" step="0.1" value={form.weightKg} onChange={(e) => setForm((p) => ({ ...p, weightKg: e.target.value }))} />
            </Field>
            <Field label="Target weight (kg)">
              <Input
                type="number"
                step="0.1"
                value={form.targetWeightKg}
                onChange={(e) => setForm((p) => ({ ...p, targetWeightKg: e.target.value }))}
              />
            </Field>
            <Field label="Blood type">
              <Input value={form.bloodType} onChange={(e) => setForm((p) => ({ ...p, bloodType: e.target.value }))} />
            </Field>
            <Field label="Allergies" className="sm:col-span-2">
              <Input value={form.allergies} onChange={(e) => setForm((p) => ({ ...p, allergies: e.target.value }))} />
            </Field>
          </>
        ) : null}
        <Field label="New password" className="sm:col-span-2" hint="Leave empty to keep the current one">
          <Input type="text" value={form.newPassword} onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))} />
        </Field>
      </div>
    </Modal>
  );
}

export function assignmentFor(assignments: AssignmentDTO[], clientId: string) {
  return assignments.find((a) => a.clientId === clientId) ?? null;
}
