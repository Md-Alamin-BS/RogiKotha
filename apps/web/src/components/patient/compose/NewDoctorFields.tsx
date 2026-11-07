'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import type { ComposerSpecialtyVM } from '@rogikotha/contracts';

import type { DraftNewDoctor } from './composer-reducer';
import { TextField } from './TextField';

// The add-a-doctor panel of step 1 (BR3.11, BR8.9). The fields are uncontrolled, so a half-typed
// name is never overwritten by an autosave answer; the composer remounts the panel only when it opens.
export function NewDoctorFields({
  value,
  specialties,
  onChange,
  onCancel,
  errors = {},
}: {
  value: DraftNewDoctor;
  specialties: readonly ComposerSpecialtyVM[];
  onChange: (value: DraftNewDoctor) => void;
  onCancel: () => void;
  /** Field -> message key; keys `name`, `specialtyId`, `practiceArea`, `bmdc`. */
  errors?: Record<string, string>;
}) {
  const t = useTranslations();
  const id = useId();
  const specialtyId = `${id}-specialty`;
  const errorId = `${id}-specialty-error`;

  // `exactOptionalPropertyTypes`: an emptied optional field is removed, never set to undefined.
  const set = (field: 'specialtyId' | 'practiceArea' | 'bmdc', text: string) => {
    const next: DraftNewDoctor = { ...value };
    if (text === '') delete next[field];
    else next[field] = text;
    onChange(next);
  };

  return (
    <div className="add-doctor" data-testid="compose-add-doctor">
      <TextField
        name="newDoctorName"
        label={t('compose.addName')}
        defaultValue={value.name}
        onChange={(name) => onChange({ ...value, name })}
        error={errors.name}
      />
      <div className="field">
        <label htmlFor={specialtyId}>
          {t('compose.addSpecialty')}
          <span className="req optional">{t('compose.optional')}</span>
        </label>
        <select
          id={specialtyId}
          name="newDoctorSpecialtyId"
          value={value.specialtyId ?? ''}
          onChange={(e) => set('specialtyId', e.target.value)}
          aria-invalid={errors.specialtyId ? true : undefined}
          aria-describedby={errors.specialtyId ? errorId : undefined}
          data-testid="compose-newDoctorSpecialtyId"
        >
          <option value="">{t('compose.addSpecialtyNone')}</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {errors.specialtyId ? (
          <p className="field-error" id={errorId}>
            {t(errors.specialtyId)}
          </p>
        ) : null}
      </div>
      <TextField
        name="newDoctorChamber"
        label={t('compose.addChamber')}
        optional
        defaultValue={value.practiceArea ?? ''}
        onChange={(text) => set('practiceArea', text)}
        error={errors.practiceArea}
      />
      <TextField
        name="newDoctorBmdc"
        label={t('compose.addBmdc')}
        hint={t('compose.addBmdcPrivate')}
        optional
        defaultValue={value.bmdc ?? ''}
        onChange={(text) => set('bmdc', text)}
        error={errors.bmdc}
      />
      <p className="sub" data-testid="compose-add-doctor-note">
        {t('label.memberAddedWhy')}
      </p>
      <button
        type="button"
        className="btn ghost small"
        onClick={onCancel}
        data-testid="compose-add-doctor-cancel"
      >
        {t('compose.addCancel')}
      </button>
    </div>
  );
}
