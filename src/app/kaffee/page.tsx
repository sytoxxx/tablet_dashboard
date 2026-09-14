import { CoffeeArea } from "@/components/coffee-area";
import { coffeeDrinks } from "@/data/coffee";

export const metadata = {
  title: "Kaffeeecke · Coffee Morning",
};

export default function KaffeePage() {
  return (
    <main>
      <CoffeeArea drinks={coffeeDrinks} />
    </main>
  );
}
