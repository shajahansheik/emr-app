"use client";

import { useState } from "react";
import Link from "next/link";
import type { FormGroup } from "@/lib/types";
import { saveFormGroup } from "@/app/actions/forms";
import { ActionForm, SubmitButton } from "./ActionForm";

interface Props {
  group?: FormGroup;
  forms: { id: string; name: string; fields: number }[];
  clinics: { id: string; name: string }[];
  users: { id: string; label: string; role: string; clinic: string }[];
}

export function FormGroupEditor({ group, forms, clinics, users }: Props) {
  const [selected, setSelected] = useState<string[]>(group?.formIds.filter((id) => forms.some((f) => f.id === id)) ?? []);
  const byId = new Map(forms.map((f) => [f.id, f]));
  const available = forms.filter((f) => !selected.includes(f.id));
  const move = (i: number, d: number) =>
    setSelected((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <ActionForm action={saveFormGroup}>
      <input type="hidden" name="id" value={group?.id ?? ""} />
      {selected.map((id) => <input key={id} type="hidden" name="formIds" value={id} />)}

      <div className="card">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="name">Group name <span className="req">*</span></label>
            <input id="name" name="name" defaultValue={group?.name} placeholder="e.g. General OPD case sheet" required />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <input id="description" name="description" defaultValue={group?.description} />
          </div>
          <div className="field">
            <label htmlFor="order">Display order</label>
            <input id="order" name="order" type="number" min={1} defaultValue={group?.order ?? 1} />
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <label className="choice"><input type="checkbox" name="active" defaultChecked={group ? group.active : true} /> Active</label>
          </div>
        </div>
      </div>

      <div className="builder-cols">
        <section className="card">
          <h2>1. Forms in this group</h2>
          {selected.length === 0 && <p className="muted">Add forms from the list below.</p>}
          <ol className="field-list">
            {selected.map((id, i) => (
              <li key={id} className="field-item">
                <div className="field-item-head">
                  <span><strong>{i + 1}. {byId.get(id)?.name}</strong> <span className="muted small">· {byId.get(id)?.fields} fields</span></span>
                  <span className="row-actions">
                    <button type="button" className="btn btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${byId.get(id)?.name} up`}>↑</button>
                    <button type="button" className="btn btn-sm" onClick={() => move(i, 1)} disabled={i === selected.length - 1} aria-label={`Move ${byId.get(id)?.name} down`}>↓</button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => setSelected((s) => s.filter((x) => x !== id))} aria-label={`Remove ${byId.get(id)?.name}`}>✕</button>
                  </span>
                </div>
              </li>
            ))}
          </ol>
          <h3>Available forms</h3>
          {available.length === 0 ? <p className="muted small">All forms are in this group.</p> : (
            <div className="chip-list">
              {available.map((f) => (
                <button key={f.id} type="button" className="btn btn-sm" onClick={() => setSelected((s) => [...s, f.id])}>+ {f.name}</button>
              ))}
            </div>
          )}
          <p className="small"><Link href="/admin/forms/new">Create a new form</Link></p>
        </section>

        <section className="card">
          <h2>2. Map to</h2>
          <div className="choices stack">
            <label className="choice"><input type="checkbox" name="roles" value="nurse" defaultChecked={group?.roles.includes("nurse")} /> All nurses <span className="muted small">— nurse case sheet</span></label>
            <label className="choice"><input type="checkbox" name="roles" value="doctor" defaultChecked={group?.roles.includes("doctor")} /> All doctors <span className="muted small">— consultation case sheet</span></label>
          </div>
          <h3>Or specific users</h3>
          <p className="muted small">Useful when one doctor needs a specialty case sheet (e.g. paediatrics).</p>
          <div className="choices stack scroll-box">
            {users.map((u) => (
              <label key={u.id} className="choice">
                <input type="checkbox" name="userIds" value={u.id} defaultChecked={group?.userIds.includes(u.id)} />
                {u.label} <span className="muted small">· {u.role}{u.clinic ? ` · ${u.clinic}` : ""}</span>
              </label>
            ))}
            {users.length === 0 && <span className="muted small">No doctors or nurses yet.</span>}
          </div>
          <h3>Clinics</h3>
          <p className="muted small">Leave all unticked to use this group in every clinic.</p>
          <div className="choices stack">
            {clinics.map((c) => (
              <label key={c.id} className="choice">
                <input type="checkbox" name="clinicIds" value={c.id} defaultChecked={group?.clinicIds.includes(c.id)} /> {c.name}
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className="form-actions">
        <Link href="/admin/form-groups" className="btn">Cancel</Link>
        <SubmitButton>Save form group</SubmitButton>
      </div>
    </ActionForm>
  );
}
