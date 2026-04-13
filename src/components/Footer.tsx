import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-stone-800 bg-stone-950 text-stone-500 text-sm">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col items-center gap-6">
        <Image
          src="/torch.wilderena.png"
          alt=""
          width={48}
          height={48}
          className="opacity-70"
        />
        <div className="w-full flex flex-wrap items-center justify-between gap-4">
          <div>&copy; {new Date().getFullYear()} Wilderena. Not affiliated with Jagex Ltd.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-forge transition">Discord</a>
            <a href="#" className="hover:text-forge transition">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
