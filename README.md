# Simple EMR

A small electronic medical records app for clinics, built with **Next.js 16 (App Router)** for both the
frontend and the backend (server components, server actions and route handlers).

## Modules

| Module | Features |
|---|---|
| **Nurse** | Register patients · book appointments · capture vitals & symptoms · assign/reassign the appointment to a doctor · today's queue |
| **Doctor** | My appointments (assigned queue) · case sheet with vitals and visit history · save draft / complete case · printable consultation report (Print / Save as PDF) · reports with date range and CSV export |
| **Admin** | Add/edit/delete doctors, nurses and admins · clinics with a **"has nurse" setting** · dashboard metrics · **form builder** · activity log |

**Doctor-only clinics.** Each clinic has a "This clinic has a nurse / front-desk user" setting
(Admin → Clinics). When it is off, doctors in that clinic also get *Register Patient*,
*Book Appointment*, *Patients* and vitals capture, so one doctor can run the whole visit.

**Form builder, form groups and mapping** (Admin → Form Builder):

1. **Forms**: build each part of the case sheet as its own form, e.g. *Vitals & Symptoms*, *Clinical Notes*,
   *Medication*, *Lab Investigations*. Field types: short text, paragraph, number, date, time, email, phone, dropdown,
   radio, checkboxes, yes/no, section heading, and **table (repeating rows)**, used for one row per medicine or per lab test.
2. **Form groups**: combine forms, in order, into a group (e.g. *Nurse Assessment* = Vitals; *Doctor Case Sheet* =
   Clinical Notes + Medication + Lab Investigations).
3. **Mapping**: map each group to **all nurses**, **all doctors** and/or **specific users**, optionally only in some clinics.
   Nurse groups make up the **nurse case sheet**; doctor groups make up the doctor's **consultation case sheet**. A doctor
   with a specialty group (e.g. *Paediatric Case Sheet* mapped to one doctor) sees it in addition to the general group;
   a form in several groups is shown once.

The doctor's screen shows what the nurse recorded alongside their own forms. The printed report and the CSV export
include every form filled for the visit. *Patient Registration* is a separate form used on Register Patient
(its name, gender, DOB and phone fields are required by the app and cannot be removed).
No clinical forms are created by default: until the admin builds forms and maps groups, the nurse and doctor case sheets are empty.

## Storage: Azure PostgreSQL or local

The storage backend is chosen automatically at start-up:

| Environment | Storage |
|---|---|
| `DATABASE_URL` is set (Azure deployment) | **Azure Database for PostgreSQL.** Tables `emr_<collection>` are created automatically. |
| No `DATABASE_URL` | `./data/db.json` on the server. |

## Run locally

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. On first run the setup wizard creates the first clinic and the admin account.
Then add clinics, doctors and nurses in the Admin module. To start over, stop the server and delete the `data/` folder.

## Deploy to Azure (App Service + Azure Database for PostgreSQL)

1. Create an **Azure Database for PostgreSQL – Flexible Server** and a database (e.g. `emr`). Allow access from Azure services.
2. Create an **App Service** (Linux, Node 20+).
3. Set these application settings:
   - `DATABASE_URL=postgres://<user>:<password>@<server>.postgres.database.azure.com:5432/emr?sslmode=require`
   - `SESSION_SECRET=<long random string>` (`openssl rand -hex 32`)
4. Build with `npm run build`. The app uses `output: "standalone"`, so deploy `.next/standalone` together with
   `.next/static` (copied to `.next/standalone/.next/static`) and start with `node server.js`.
   Alternatively deploy the repo and use `npm run build && npm start` as the startup command.
5. Use `/api/health` as the App Service health-check path.

## Project layout

```
src/
  app/
    actions/          server actions (auth, admin, clinical, forms)
    (app)/            logged-in pages (dashboard, admin/*, queue, patients, appointments, consult, reports)
    api/              reports CSV export, health
    login/ setup/     sign-in and first-run wizard
  components/         ActionForm, DynamicFields (renders builder forms), FormBuilder, Shell…
  lib/
    db/               Store interface + PostgresStore + LocalStore
    forms.ts          default forms, reading submitted form values
    permissions.ts    who can do what (incl. doctor-only clinics)
    session.ts        signed-cookie sessions (jose), requireUser()
  proxy.ts            redirects anonymous users to /login
```

## Extending: Lab and Pharmacy modules

- Add the roles (`lab`, `pharmacist`) to `Role` in `src/lib/types.ts` and to the user form.
- Add collections (e.g. `lab_orders`, `dispenses`) to `COLLECTIONS`; both storage backends pick them up automatically (a new PostgreSQL table / a new key in `data/db.json`).
- Lab orders and prescriptions can be created from the case sheet (`saveCaseSheet` in `src/app/actions/clinical.ts`);
  structured prescription lines would be a natural next field type for the form builder.
