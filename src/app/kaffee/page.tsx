"use client";

import { CoffeeArea } from "@/components/coffee/coffee-area";
import { useAppData } from "@/components/providers/data-provider";

export default function KaffeePage() {
  const { data } = useAppData();
  return (
    <main>
      <CoffeeArea drinks={data.coffeeDrinks} />
    </main>
  );
}
