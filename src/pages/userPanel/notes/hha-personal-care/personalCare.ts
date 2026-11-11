import {format} from 'date-fns';
import type {ActivityLogNote} from '../apiTypes';

/** What a personal care note row holds. */
export interface PersonalCareValues {
    checkedActivities: string[];
    narrative: string;
    confirmed: boolean;
    completedBy: string;
    completionDate: string;
}

export const EMPTY_PERSONAL_CARE: PersonalCareValues = {checkedActivities: [], narrative: '', confirmed: false, completedBy: '', completionDate: ''};

export function readPersonalCare(note: ActivityLogNote): PersonalCareValues {
    const metadata = note.metadata ?? {};
    return {
        checkedActivities: Array.isArray(metadata.checkedActivities) ? metadata.checkedActivities.filter((value: unknown): value is string => typeof value === 'string') : [],
        narrative: typeof metadata.narrative === 'string' ? metadata.narrative : '',
        confirmed: metadata.confirmed === true,
        completedBy: typeof metadata.completedBy === 'string' ? metadata.completedBy : '',
        completionDate: typeof metadata.completionDate === 'string' ? metadata.completionDate : '',
    };
}

/** Row metadata; the signer and completion date are always the current user and today. */
export function writePersonalCare(values: PersonalCareValues, signer: string) {
    return {
        checkedActivities: values.checkedActivities,
        narrative: values.narrative,
        confirmed: values.confirmed,
        completedBy: signer,
        completionDate: format(new Date(), 'yyyy-MM-dd'),
    };
}

export const hasPersonalCareContent = (values: PersonalCareValues) => values.checkedActivities.length > 0 || values.narrative.trim().length > 0;

/** A starting narrative from the ticked activities, for the caregiver to edit. */
export function draftFromActivities(activities: string[]) {
    if (!activities.length) return null;
    const names = activities.map(activity => activity.replace(/ assistance$/i, '').toLowerCase());
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
    return `During the visit I helped with ${list}. [Add how the client responded, anything they did for themselves, and anything new or different.]`;
}
