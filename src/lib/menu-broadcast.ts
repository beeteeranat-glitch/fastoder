import { menuBroadcastChannel } from "@/lib/menu-broadcast-channel";
import { createServerClient } from "@/lib/supabase/server";

export { menuBroadcastChannel };

/** แจ้ง client ทุกแท็บให้โหลดเมนูใหม่ (ไม่พึ่ง postgres publication) */
export async function notifyMenuChanged() {
  try {
    const supabase = createServerClient();
    const channelName = menuBroadcastChannel();

    await new Promise<void>((resolve) => {
      const channel = supabase.channel(channelName);
      const timeout = setTimeout(() => {
        void supabase.removeChannel(channel);
        resolve();
      }, 4000);

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.send({
            type: "broadcast",
            event: "updated",
            payload: { at: Date.now() },
          });
          await new Promise((resolve) => setTimeout(resolve, 150));
          clearTimeout(timeout);
          await supabase.removeChannel(channel);
          resolve();
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timeout);
          void supabase.removeChannel(channel);
          resolve();
        }
      });
    });
  } catch (error) {
    console.error("notifyMenuChanged error:", error);
  }
}
