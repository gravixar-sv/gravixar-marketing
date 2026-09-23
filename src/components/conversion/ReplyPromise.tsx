import Image from "next/image";

// The person behind the form, before anyone fills it in. A one-operator
// business asking for a note should show the operator and say when the reply
// comes: the 24-hour promise is the same one the note form's confirmation and
// this page's meta description already make. The address is a plain fallback
// for anyone who would rather use their own mail client.
//
// The avatar is the About portrait, cropped to the face and art-directed into
// the dark the same way (warm grayscale, a touch darker), so it reads as one
// photograph across the site instead of a bright pasted headshot.
export function ReplyPromise() {
  return (
    <div className="flex items-center gap-4">
      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-ink-900 ring-1 ring-line-strong">
        {/* The source is a 1:1 studio shot with the face above centre, right
            of middle; the oversized box puts the face in the circle. */}
        <span className="absolute -left-[74%] -top-[20%] h-[230%] w-[230%]">
          <Image
            src="/about/qamar.jpg"
            alt=""
            fill
            sizes="112px"
            className="object-cover grayscale sepia-[.22] brightness-[.9] contrast-[1.06]"
          />
        </span>
      </span>
      <div className="min-w-0">
        <p className="text-[0.9375rem] leading-snug text-ink-100">
          You will hear back from me, Qamar, within 24 hours.
        </p>
        <p className="mt-1 text-caption text-ink-400">
          Or email{" "}
          <a href="mailto:gravixar@gmail.com" className="link-quiet">
            gravixar@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
