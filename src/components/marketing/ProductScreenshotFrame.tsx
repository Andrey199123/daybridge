import type { ReactNode } from "react";

type ProductScreenshotFrameProps = {
  imageSrc: string;
  imageAlt: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
  frameClassName?: string;
  imageClassName?: string;
  imageWrapperClassName?: string;
  overlay?: ReactNode;
  onClick?: () => void;
  buttonAriaLabel?: string;
  loading?: "eager" | "lazy";
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ProductScreenshotFrame({
  imageSrc,
  imageAlt,
  width,
  height,
  sizes,
  className,
  frameClassName,
  imageClassName,
  imageWrapperClassName,
  overlay,
  onClick,
  buttonAriaLabel,
  loading = "lazy",
}: ProductScreenshotFrameProps) {
  const frame = (
    <div
      className={joinClasses(
        "relative overflow-hidden rounded-[28px] border border-[#32557e] bg-[#081423] p-3 shadow-[0_28px_90px_rgba(2,8,18,0.55)] transition-transform duration-300 ease-out",
        onClick && "group-hover:-translate-y-1",
        frameClassName,
      )}
    >
      <div
        className={joinClasses(
          "relative overflow-hidden rounded-[22px] border border-[#314d74] bg-[#091626]",
          imageWrapperClassName,
        )}
      >
        <img
          src={imageSrc}
          alt={imageAlt}
          width={width}
          height={height}
          sizes={sizes}
          className={joinClasses(
            "block w-full object-cover transition-transform duration-500",
            onClick && "group-hover:scale-[1.015]",
            imageClassName,
          )}
          loading={loading}
          decoding="async"
        />
      </div>
      {overlay}
    </div>
  );

  if (!onClick) {
    return <div className={joinClasses("group relative", className)}>{frame}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={buttonAriaLabel}
      className={joinClasses(
        "group relative block w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6ea8ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111d]",
        className,
      )}
    >
      {frame}
    </button>
  );
}
