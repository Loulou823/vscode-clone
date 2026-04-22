const domain: string = 'https://api.ipify.org?format=json';

let isconnected: boolean = false;

fetch(domain)
  .then(res => res.json())
  .then(data => {
    console.log("Your IP:", data.ip);
    isconnected = true;
  })
  .catch(err => {
    console.error("Request failed:", err);
    isconnected = false;
  });
export { isconnected };