"use client"

// iOS 스타일 토글 — checked prop을 JS로 직접 검사해 색/위치 결정
// (Tailwind v3.4에서 data-checked: variant가 적용되지 않는 환경 호환)

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

  const sizeCls = {
    default: "h-[28px] w-[48px]",
    sm: "h-[20px] w-[34px]",
  }
  const thumbSizeCls = {
    default: "h-[24px] w-[24px]",
    sm: "h-[16px] w-[16px]",
  }
  // 컨테이너 width - thumb width - 좌측 시작 padding(2) = 우측 도달 거리
  // default: 48 - 24 - 2 = 22  /  sm: 34 - 16 - 2 = 16
  const translateCls = {
    default: isOn ? "translate-x-[22px]" : "translate-x-[2px]",
    sm: isOn ? "translate-x-[16px]" : "translate-x-[2px]",
  }

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      checked={checked}
      disabled={disabled}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors outline-none",
        "after:absolute after:-inset-x-2 after:-inset-y-2", // 클릭 영역 살짝 확장
        "focus-visible:ring-2 focus-visible:ring-emerald-400/50",
        sizeCls[size],
        // 핵심: prop 기반으로 직접 색상 결정 (Tailwind data variant에 의존 X)
        isOn
          ? "bg-emerald-500 dark:bg-emerald-500"
          : "bg-slate-300 dark:bg-slate-700",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-md ring-0 transition-transform",
          thumbSizeCls[size],
          translateCls[size]
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
