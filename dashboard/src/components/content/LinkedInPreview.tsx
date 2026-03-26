import { useState } from "react";
import { Globe, ThumbsUp, MessageSquare, Repeat2, Send, ChevronLeft, ChevronRight } from "lucide-react";

export interface CarouselSlide {
  title: string;
  body: string;
  slideNumber: number;
}

export interface LinkedInPreviewProps {
  content: string;
  authorName?: string;
  authorTitle?: string;
  carouselSlides?: CarouselSlide[];
  imageUrl?: string;
}

export function LinkedInPreview({
  content,
  authorName = "Tu Nombre",
  authorTitle = "Tu Cargo",
  carouselSlides,
  imageUrl,
}: LinkedInPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const hasCarousel = carouselSlides && carouselSlides.length > 0;

  // Truncate at ~3 lines (~210 chars) when collapsed
  const TRUNCATE_LEN = 210;
  const shouldTruncate = content.length > TRUNCATE_LEN && !expanded;
  const displayText = shouldTruncate
    ? content.slice(0, TRUNCATE_LEN).trimEnd()
    : content;

  const prevSlide = () =>
    setCurrentSlide((i) => Math.max(0, i - 1));
  const nextSlide = () =>
    setCurrentSlide((i) =>
      Math.min((carouselSlides?.length ?? 1) - 1, i + 1)
    );

  return (
    <div className="bg-white rounded-lg border border-[#e0e0e0] shadow-sm overflow-hidden max-w-[555px] w-full font-[system-ui,_-apple-system,_sans-serif]">
      {/* ── Profile Header ── */}
      <div className="flex items-start gap-3 px-4 pt-3 pb-2">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0a66c2] to-[#004182] flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg leading-none">
            {authorName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#191919] leading-tight">
            {authorName}
          </p>
          <p className="text-xs text-[#666666] leading-tight mt-0.5 truncate">
            {authorTitle}
          </p>
          <p className="text-xs text-[#666666] leading-tight mt-0.5 flex items-center gap-1">
            Just now &middot;{" "}
            <Globe className="w-3 h-3 text-[#666666] inline" />
          </p>
        </div>
        {/* LinkedIn logo */}
        <div className="shrink-0 mt-0.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#0a66c2">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </div>
      </div>

      {/* ── Post Text ── */}
      <div className="px-4 pb-3">
        <p className="text-sm text-[#191919] leading-[1.4] whitespace-pre-wrap break-words">
          {displayText}
          {shouldTruncate && (
            <>
              {"... "}
              <button
                onClick={() => setExpanded(true)}
                className="text-[#666666] hover:text-[#0a66c2] hover:underline font-semibold cursor-pointer"
              >
                more
              </button>
            </>
          )}
        </p>
      </div>

      {/* ── Image ── */}
      {imageUrl && !hasCarousel && (
        <div className="border-t border-[#e0e0e0]">
          <img
            src={imageUrl}
            alt="Post image"
            className="w-full object-cover max-h-[400px]"
          />
        </div>
      )}

      {/* ── Carousel ── */}
      {hasCarousel && (
        <div className="border-t border-[#e0e0e0]">
          {/* Slide */}
          <div className="relative bg-[#f3f2ef]">
            <div className="aspect-[4/5] max-h-[440px] flex items-center justify-center p-6">
              <div className="bg-white rounded-lg shadow-md w-full h-full flex flex-col items-center justify-center p-8 text-center">
                {/* Slide number */}
                <div className="text-xs font-medium text-[#666666] mb-4 tracking-wide uppercase">
                  {carouselSlides![currentSlide]!.slideNumber} /{" "}
                  {carouselSlides!.length}
                </div>
                {/* Title */}
                <h3 className="text-xl font-bold text-[#191919] mb-3 leading-tight max-w-[90%]">
                  {carouselSlides![currentSlide]!.title || "Slide Title"}
                </h3>
                {/* Body */}
                <p className="text-sm text-[#666666] leading-relaxed max-w-[85%] whitespace-pre-wrap">
                  {carouselSlides![currentSlide]!.body || "Slide content goes here..."}
                </p>
              </div>
            </div>

            {/* Nav arrows */}
            {currentSlide > 0 && (
              <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 text-[#191919]" />
              </button>
            )}
            {currentSlide < carouselSlides!.length - 1 && (
              <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 text-[#191919]" />
              </button>
            )}
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 py-2 bg-[#f3f2ef]">
            {carouselSlides!.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2 h-2 rounded-full transition cursor-pointer ${
                  i === currentSlide ? "bg-[#0a66c2]" : "bg-[#bbb]"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Engagement counts ── */}
      <div className="flex items-center justify-between px-4 py-1.5 text-xs text-[#666666]">
        <div className="flex items-center gap-1">
          <span className="flex -space-x-0.5">
            <span className="w-4 h-4 rounded-full bg-[#0a66c2] flex items-center justify-center">
              <ThumbsUp className="w-2.5 h-2.5 text-white" />
            </span>
            <span className="w-4 h-4 rounded-full bg-[#e74040] flex items-center justify-center text-[8px]">
              ❤️
            </span>
          </span>
          <span className="ml-1">42</span>
        </div>
        <div className="flex items-center gap-3">
          <span>7 comments</span>
          <span>3 reposts</span>
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className="border-t border-[#e0e0e0] flex items-center justify-around px-2 py-1">
        <ActionButton icon={<ThumbsUp className="w-5 h-5" />} label="Like" />
        <ActionButton icon={<MessageSquare className="w-5 h-5" />} label="Comment" />
        <ActionButton icon={<Repeat2 className="w-5 h-5" />} label="Repost" />
        <ActionButton icon={<Send className="w-5 h-5" />} label="Send" />
      </div>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-md text-[#666666] hover:bg-[#e8e8e8] transition text-xs font-semibold cursor-pointer">
      {icon}
      <span>{label}</span>
    </button>
  );
}
