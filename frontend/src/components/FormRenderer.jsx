// src/components/FormRenderer.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import Progress from "./Progress";
import "../styles/form.css";

/**
 * Renders the form dynamically from schemaUrl (defaults to /schema.json).
 * Supports steps (Step 1 Aadhaar, Step 2 PAN) and PIN auto-fill.
 */
export default function FormRenderer({ schemaUrl = "/schema.json" }) {
  const [schema, setSchema] = useState(null);
  const [stepsFields, setStepsFields] = useState([]); // array of arrays of fields
  const [currentStep, setCurrentStep] = useState(0);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors },
  } = useForm({ mode: "onChange" });

  // Load schema and enrich it with default patterns if missing
  useEffect(() => {
    async function load() {
      const res = await fetch(schemaUrl);
      const json = await res.json();
      const enriched = enrichSchema(json);
      setSchema(enriched);
      setStepsFields(splitIntoSteps(enriched.fields || []));
    }
    load();
  }, [schemaUrl]);

  // derive pin field name and state/city field names
  const pinFieldName = useMemo(() => {
    if (!schema) return null;
    const f = schema.fields.find((f) =>
      /pin|pincode|postal/i.test(f.name || f.id || "")
    );
    return f ? f.name || f.id : null;
  }, [schema]);

  const stateFieldName = useMemo(() => {
    if (!schema) return null;
    const f = schema.fields.find((f) => /state/i.test(f.name || f.id || ""));
    return f ? f.name || f.id : null;
  }, [schema]);

  const cityFieldName = useMemo(() => {
    if (!schema) return null;
    const f = schema.fields.find((f) =>
      /(city|district|taluka)/i.test(f.name || f.id || "")
    );
    return f ? f.name || f.id : null;
  }, [schema]);

  // watch all values; extract pin value dynamically
  const allValues = watch();
  const pinValue = pinFieldName ? allValues[pinFieldName] : undefined;

  // PIN code auto-fill effect
  useEffect(() => {
    if (!pinValue || String(pinValue).length !== 6) return;
    (async () => {
      try {
        const r = await fetch(
          `https://api.postalpincode.in/pincode/${pinValue}`
        );
        const d = await r.json();
        if (Array.isArray(d) && d[0].Status === "Success") {
          const p = d[0].PostOffice && d[0].PostOffice[0];
          if (p) {
            if (stateFieldName) setValue(stateFieldName, p.State);
            if (cityFieldName) setValue(cityFieldName, p.District);
          }
        }
      } catch (e) {
        // ignore; pin autofill is a bonus feature
        // console.error("Pin API error", e);
      }
    })();
  }, [pinValue, stateFieldName, cityFieldName, setValue]);

  if (!schema) return <div className="loading">Loading form...</div>;

  const stepLabels = ["Step 1", "Step 2"]; // Keep simple; could be enhanced to read from schema

  const currentFields = stepsFields[currentStep] || [];

  // Next button: validate current step fields before advancing
  const onNext = async () => {
    const names = currentFields.map((f) => f.name || f.id).filter(Boolean);
    const ok = await trigger(names);
    if (ok) {
      setCurrentStep((s) => Math.min(s + 1, stepsFields.length - 1));
    } else {
      // scroll to first error field
      const firstErr = Object.keys(errors)[0];
      if (firstErr) {
        const el = document.querySelector(`[name="${firstErr}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const onBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const onSubmit = async (data) => {
    try {
      await axios.post("/api/submit", data);
      alert("Submitted successfully!");
    } catch (err) {
      alert("Submit failed: " + (err?.response?.data?.message || err.message));
    }
  };

  return (
    <div className="ud-form-wrap">
      <Progress
        steps={stepLabels}
        current={currentStep}
        onSelect={(i) => setCurrentStep(i)}
      />

      <form className="ud-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <h2 className="ud-title">
          Udyam Registration — Steps 1 &amp; 2 (clone)
        </h2>

        {currentFields.length === 0 && (
          <p className="muted">No fields for this step.</p>
        )}

        {currentFields.map((f, i) => {
          const name = f.name || f.id || `field_${i}`;
          const label = f.label || f.placeholder || prettifyName(name);
          const required = !!f.required;
          const maxLength = f.maxlength ? parseInt(f.maxlength, 10) : undefined;

          // build validation rules for react-hook-form
          const validation = {};
          if (required) validation.required = `${label} is required`;
          if (maxLength)
            validation.maxLength = {
              value: maxLength,
              message: `Max ${maxLength} characters`,
            };
          if (f.pattern) {
            try {
              validation.pattern = {
                value: new RegExp(f.pattern),
                message: `${label} invalid format`,
              };
            } catch (e) {
              // if pattern parse fails, ignore
            }
          }

          // handle types
          if (f.tag === "select") {
            return (
              <div className="ud-field" key={name}>
                <label className="ud-label">{label}</label>
                <select
                  {...register(name, validation)}
                  name={name}
                  className="ud-input"
                >
                  <option value="">Select</option>
                  {(f.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label || opt.value}
                    </option>
                  ))}
                </select>
                {errors[name] && (
                  <p className="ud-error">{errors[name].message}</p>
                )}
              </div>
            );
          }

          if (f.type === "checkbox") {
            return (
              <div className="ud-field checkbox" key={name}>
                <label className="ud-checkbox-label">
                  <input
                    type="checkbox"
                    {...register(name, validation)}
                    name={name}
                  />
                  <span>{label}</span>
                </label>
                {errors[name] && (
                  <p className="ud-error">{errors[name].message}</p>
                )}
              </div>
            );
          }

          // default input
          return (
            <div className="ud-field" key={name}>
              <label className="ud-label">{label}</label>
              <input
                {...register(name, validation)}
                name={name}
                placeholder={f.placeholder || ""}
                maxLength={maxLength}
                className="ud-input"
              />
              {errors[name] && (
                <p className="ud-error">{errors[name].message}</p>
              )}
            </div>
          );
        })}

        <div className="ud-actions">
          {currentStep > 0 ? (
            <button type="button" className="btn btn-ghost" onClick={onBack}>
              Back
            </button>
          ) : (
            <div />
          )}
          {currentStep < stepsFields.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={onNext}>
              Next
            </button>
          ) : (
            <button type="submit" className="btn btn-primary">
              Submit
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/* ---------- helpers ---------- */

function prettifyName(name) {
  return String(name)
    .replace(/[_\-\$\.\d]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function enrichSchema(json) {
  // ensure fields array exists
  const fields = (json.fields || []).map((f) => {
    const out = { ...f };
    const key = (f.name || f.id || "").toLowerCase();

    // add some default patterns if missing
    if (!out.pattern) {
      if (/aadhaar|adhar|aadhar|txtadharno/.test(key))
        out.pattern = "^\\d{12}$";
      if (/pan|pancard|txtpan/.test(key))
        out.pattern = "^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$";
      if (/otp/.test(key)) out.pattern = "^\\d{6}$";
      if (/pin|pincode|postal/.test(key)) out.pattern = "^\\d{6}$";
    }
    return out;
  });

  return { ...json, fields };
}

/**
 * Splits fields into two steps:
 * - Step 1: fields that look like aadhaar / ownername / otp / validate Aadhaar
 * - Step 2: fields that look like PAN or everything else
 *
 * If your form_schema.json contains a "step" attribute on fields, this function will respect it.
 */
function splitIntoSteps(fields) {
  // If fields themselves include "step", group by that
  const hasStepAttr = fields.some((f) => f.step !== undefined);
  if (hasStepAttr) {
    const map = {};
    fields.forEach((f) => {
      const stepKey = String(f.step || 0);
      if (!map[stepKey]) map[stepKey] = [];
      map[stepKey].push(f);
    });
    // sort by key and return arrays
    return Object.keys(map)
      .sort()
      .map((k) => map[k]);
  }

  // fallback auto-detection by keywords
  const step1Keywords = [
    /aadhaar|adhar|aadhar|txtadharno|ownername|validateaadhaar|otp/i,
  ];
  const step2Keywords = [/pan|pancard|txtpan|tan/i];

  const step1 = [];
  const step2 = [];

  fields.forEach((f) => {
    const key = (f.name || f.id || "").toString();
    if (step1Keywords.some((rx) => rx.test(key))) {
      step1.push(f);
    } else if (step2Keywords.some((rx) => rx.test(key))) {
      step2.push(f);
    } else {
      // skip hidden/internal fields into none; otherwise put into step2
      if ((f.type || f.tag) === "hidden") return;
      step2.push(f);
    }
  });

  // ensure step1 isn't empty (if empty, move first few intuitive fields)
  if (step1.length === 0 && step2.length > 0) {
    // try to move first 2 fields to step1 (a reasonable fallback)
    step1.push(...step2.splice(0, Math.min(2, step2.length)));
  }

  return [step1, step2];
}
