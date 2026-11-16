import { Fragment } from "react";
import { ipDisplayParts, maskIpAddress } from "../presentation";

/** Reserve both display layouts without leaving the concealed address in the DOM. */
export function StableIpAddress({ address, hidden }: { address: string; hidden: boolean }) {
  const masked = maskIpAddress(address);
  const parts = (value: string) => ipDisplayParts(value).map((part, index) => <Fragment key={index}>{index > 0 && <wbr />}{part}</Fragment>);
  return <span className="grid min-w-0" data-stable-ip>
    {[address, masked].map((value, index) => <span key={index} aria-hidden="true" className="invisible pointer-events-none col-start-1 row-start-1 select-none">{parts(value.replace(/[0-9a-f]/gi, "0"))}</span>)}
    <span className="col-start-1 row-start-1">{parts(hidden ? masked : address)}</span>
  </span>;
}
