const nightStartsAt = 18 * 60 + 30;
const dayStartsAt = 5 * 60 + 30;

export function isNightInDouala(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Africa/Douala",
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour");
  const minute = parts.find((part) => part.type === "minute");

  if (!hour || !minute) {
    throw new Error("Could not determine the current Africa/Douala time.");
  }

  const localMinutes = Number(hour.value) * 60 + Number(minute.value);
  return localMinutes >= nightStartsAt || localMinutes < dayStartsAt;
}

export const themeBootstrapScript = `(()=>{const p=new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",hourCycle:"h23",timeZone:"Africa/Douala"}).formatToParts(new Date());const h=Number(p.find(x=>x.type==="hour").value);const m=Number(p.find(x=>x.type==="minute").value);const t=h*60+m;document.documentElement.classList.toggle("theme-night",t>=${nightStartsAt}||t<${dayStartsAt})})()`;
