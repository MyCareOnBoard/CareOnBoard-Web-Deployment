import type {SVGProps} from 'react';

// Line icons drawn to match the Clients & services design (two people, heart with search, box with clock, note).
type IconProps = SVGProps<SVGSVGElement>;
const base = {viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true} as const;

export function TwoPeopleIcon(props: IconProps) {
    return <svg {...base} {...props}>
        <circle cx="9" cy="7.5" r="3.5"/>
        <path d="M3 19.5c0-3 2.7-5 6-5s6 2 6 5"/>
        <path d="M15.5 4.3a3.5 3.5 0 0 1 0 6.4"/>
        <path d="M18 14.8c1.8.6 3 2 3 4.2"/>
    </svg>;
}

export function HeartSearchIcon(props: IconProps) {
    return <svg {...base} {...props}>
        <path d="M12 20.2C8.6 18 3 14.2 3 9.1 3 6.3 5.2 4 7.9 4c1.7 0 3.1.8 4.1 2 1-1.2 2.4-2 4.1-2C18.8 4 21 6.3 21 9.1c0 .9-.2 1.8-.5 2.6"/>
        <circle cx="17" cy="16.5" r="2.6"/>
        <path d="m19 18.5 1.8 1.8"/>
    </svg>;
}

export function BoxClockIcon(props: IconProps) {
    return <svg {...base} {...props}>
        <path d="M20.5 11V7.6L12 3 3.5 7.6v8.8L12 21l.8-.4"/>
        <path d="M3.8 7.8 12 12.3l8.2-4.5"/>
        <path d="M12 21v-8.7"/>
        <circle cx="18" cy="17.5" r="3.5"/>
        <path d="M18 16v1.6l1 .8"/>
    </svg>;
}

export function NoteIcon(props: IconProps) {
    return <svg {...base} {...props}>
        <path d="M21 13V8c0-3-1.5-5-5-5H8C4.5 3 3 5 3 8v8c0 3 1.5 5 5 5h5"/>
        <path d="M21 13l-8 8v-3c0-3.3 1.7-5 5-5h3Z"/>
        <path d="M7 9h8M7 13h4"/>
    </svg>;
}
