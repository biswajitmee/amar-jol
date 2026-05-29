let bubblePreviewBurstToken = 0;

export function triggerBubblePreviewBurst() {
  bubblePreviewBurstToken += 1;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("waterpro:bubble-preview"));
  }
}

export function getBubblePreviewBurstToken() {
  return bubblePreviewBurstToken;
}

if (typeof window !== "undefined") {
  window.__waterproTriggerBubblePreview = triggerBubblePreviewBurst;
}
