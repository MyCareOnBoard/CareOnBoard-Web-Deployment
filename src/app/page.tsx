import Image from "next/image"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileUpload } from "@/components/ui/file-upload"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Toggle } from "@/components/ui/toggle"
import { MailCheckIcon, SendIcon } from "lucide-react"

export default function Home() {
  return (
    <div className="font-sans grid min-h-screen grid-rows-[auto_1fr_auto] items-start gap-16 p-6 sm:p-12">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <Image
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          className="dark:invert"
          priority
        />
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Shadcn/ui components themed with the Care On Board palette.
        </p>
      </header>

      <main className="flex w-full flex-col gap-12">
        <section className="grid gap-6 rounded-2xl border border-border/70 bg-card/60 p-6 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold text-foreground">Actions</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="default">Primary Action</Button>
            <Button variant="secondary">Secondary Action</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
            <Toggle defaultPressed aria-label="Toggle" />
          </div>
        </section>

        <section className="grid gap-6 rounded-2xl border border-border/70 bg-card/60 p-6 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold text-foreground">Form Controls</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="grid gap-3">
              <label className="text-sm font-medium text-foreground" htmlFor="name">
                Full Name
              </label>
              <Input id="name" placeholder="Jane Doe" />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium text-foreground" htmlFor="role">
                Role
              </label>
              <Select defaultValue="colleague">
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="colleague">Colleague</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 md:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="resume">
                Documents
              </label>
              <FileUpload id="resume" label="Upload your resume" />
            </div>
            <div className="grid gap-3 md:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                Email with Action
              </label>
              <InputGroup>
                <InputGroupAddon>
                  <MailCheckIcon className="size-4 text-[var(--color-main)]" />
                </InputGroupAddon>
                <InputGroupInput id="email" type="email" placeholder="name@careonboard.com" />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton size="sm">
                    <SendIcon className="size-4" />
                    Send
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
            <div className="grid gap-3">
              <span className="text-sm font-medium text-foreground">Availability</span>
              <RadioGroup defaultValue="no" className="flex gap-4">
                <label htmlFor="availability-no" className="flex items-center gap-2 text-sm text-foreground">
                  <RadioGroupItem value="no" id="availability-no" /> No
                </label>
                <label htmlFor="availability-yes" className="flex items-center gap-2 text-sm text-foreground">
                  <RadioGroupItem value="yes" id="availability-yes" /> Yes
                </label>
              </RadioGroup>
            </div>
            <div className="grid gap-3">
              <span className="text-sm font-medium text-foreground">Progress</span>
              <Slider defaultValue={[60]} max={100} className="w-full" />
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-2xl border border-border/70 bg-card/60 p-6 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold text-foreground">Statuses</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="confirmed">Confirmed</Badge>
            <Badge variant="rejected">Rejected</Badge>
            <Badge variant="pending">Pending</Badge>
          </div>
        </section>

        <section className="grid gap-6 rounded-2xl border border-border/70 bg-card/60 p-6 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold text-foreground">Success Dialog</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-fit">Show Success State</Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#f0faf4]">
                  <div className="flex h-18 w-18 items-center justify-center rounded-full bg-[var(--color-green)]">
                    <svg viewBox="0 0 24 24" fill="none" className="size-6 text-white">
                      <path
                        d="M6 12.5 9.5 16l8.5-8.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
        </div>
                <DialogTitle>Stage 1 Submitted</DialogTitle>
                <DialogDescription>
                  You have successfully completed Profile &amp; Pre-Screening. Click ‘next’ to go to the next phase.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button className="w-full">Next</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} Care On Board UI</span>
        <a
          href="https://nextjs.org"
          className="hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          Next.js
        </a>
        <a
          href="https://ui.shadcn.com"
          className="hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          shadcn/ui
        </a>
      </footer>
    </div>
  )
}