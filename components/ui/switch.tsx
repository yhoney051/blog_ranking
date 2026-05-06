"use client"

// iOS 스타일 토글 — 사이트 brand color(lime)와 어울리는 톤으로 정돈
// checked prop을 JS로 직접 검사 (Tailwind v3.4 data-* variant 비호환 환경 호환)

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  checked,
  disabled,
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  const isOn = !!checked

  // 사이즈 정의 — 미세 패딩 2px, 컨테이너 width = thumb width + 좌우 패딩 + 이동거리
  const sizeCls = {
    default: "h-[24px] w-[42px]",
    sm: "h-[18px] w-[32px]",
  }
  const thumbSizeCls = {
    default: "h-[20px] w-[20px]",
    sm: "h-[14px] w-[14px]",
  }
  // 좌측 시작 2px, 우측 끝 = 컨테이너 - thumb - 2 → default: 42-20-2=20  / sm: 32-14-2=16
  const translateCls = {
    default: isOn ? "translate-x-[20px]" : "translate-x-[2px]",
    sm: isOn ? "translate-x-[16px]" : "translate-x-[2px]",
  }

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      checked={checked}
      disabled={disabled}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 outline-none",
        "after:absolute after:-inset-x-2 after:-inset-y-2", // 모바일 클릭 영역 확장
        "focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-offset-2",
        sizeCls[size],
        // ON: 사이트 brand lime (라이트/다크 동일)
        // OFF: 라이트=slate-200 / 다크=slate-700 — thumb 흰색과 충분한 대비
        isOn
          ? "bg-brand-500 dark:bg-brand-500"
          : "bg-slate-200 dark:bg-slate-700",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
          thumbSizeCls[size],
          translateCls[size]
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
