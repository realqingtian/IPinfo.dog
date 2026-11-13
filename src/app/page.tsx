import Image from "next/image";
import logo from "../../assets/brand/logo.png";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <div className="flex items-center gap-3">
        <Image src={logo} alt="" width={56} height={56} unoptimized priority />
        <span className="text-xl font-semibold">IPinfo.dog</span>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">新版本正在准备中</h1>
      <p className="text-base leading-7 text-muted-foreground">
        更简洁的 IP 查询与出口检测，即将上线。
      </p>
    </main>
  );
}
