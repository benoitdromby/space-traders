<!--
  Loading placeholder for any list of cards shaped like: [avatar | title + subtitle | badge] over
  a two-column body. It renders an <li>, so use it inside a <ul>.
  Size it to the real card from the caller (e.g. class="min-h-35.5") to avoid a layout jump when
  the data arrives. Its colours and shimmer come from the theme (`skeleton` utility in main.css).
-->
<template>
  <li class="rounded-lg border border-line bg-surface px-3.5 py-3" aria-hidden="true">
    <div class="mb-2.5 flex items-center gap-2.5">
      <div class="skeleton size-8 shrink-0 rounded-full" />
      <div class="flex flex-1 flex-col gap-1.5">
        <div class="skeleton h-3.25 w-22" />
        <div class="skeleton h-2.25 w-15" />
      </div>
      <div class="skeleton h-4.5 w-18 rounded-[3px]" />
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div class="flex flex-col gap-1.5">
        <div class="skeleton h-2.25 w-12" />
        <div class="skeleton h-2.75 w-25" />
      </div>
      <div class="flex flex-col gap-2">
        <div class="flex flex-col gap-1">
          <div class="skeleton h-2.25 w-10" />
          <div class="skeleton h-1" />
        </div>
        <div class="flex flex-col gap-1">
          <div class="skeleton h-2.25 w-9" />
          <div class="skeleton h-1" />
        </div>
      </div>
    </div>
  </li>
</template>
