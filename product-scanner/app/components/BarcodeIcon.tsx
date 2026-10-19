
import Image from "next/image";

type BarcodeIconProps = {
  size?: number;
};

export default function BarcodeIcon({
  size = 24,
}: BarcodeIconProps) {
  return (
    <Image
      src="/barcode.png"
      alt=""
      width={size}
      height={size}
      className="barcode-icon"
    />
  );
}
