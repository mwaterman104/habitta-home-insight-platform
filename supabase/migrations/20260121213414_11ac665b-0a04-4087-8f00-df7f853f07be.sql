-- Fix year_built for 9511 Phipps Lane based on ATTOM data (home was built in 2012)
UPDATE homes 
SET year_built = 2012 
WHERE id = '46ba7ab3-1682-422d-8cd4-de6ae4f40794';