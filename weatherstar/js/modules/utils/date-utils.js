// Simple date utilities to replace luxon functionality

// Format time with seconds (e.g., "11:35:08 PM")
export const formatTimeWithSeconds = (date) => {
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const seconds = date.getSeconds();
	const ampm = hours >= 12 ? 'PM' : 'AM';
	const displayHours = hours % 12 || 12;
	return `${displayHours.toString().padStart(2, ' ')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
};

// Format time simple (e.g., "11:35 PM")
export const formatTimeSimple = (date) => {
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const ampm = hours >= 12 ? 'PM' : 'AM';
	const displayHours = hours % 12 || 12;
	return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

// Format date (e.g., " MON JAN 15")
export const formatDate = (date) => {
	const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
	const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
	const dayName = days[date.getDay()];
	const monthName = months[date.getMonth()];
	const day = date.getDate();
	return ` ${dayName} ${monthName} ${day.toString().padStart(2, ' ')}`;
};

// Get current date
export const now = () => new Date();

// Add days to a date
export const plusDays = (date, days) => {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
};

// Subtract days from a date
export const minusDays = (date, days) => {
	const result = new Date(date);
	result.setDate(result.getDate() - days);
	return result;
};

// Parse ISO string to Date
export const fromISO = (isoString) => new Date(isoString);

// Get start of day
export const startOfDay = (date) => {
	const result = new Date(date);
	result.setHours(0, 0, 0, 0);
	return result;
};

// Get UTC date
export const utc = () => new Date();

// Get day name (e.g., "Monday")
export const getDayName = (date) => {
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	return days[date.getDay()];
};

// Get short day name (e.g., "Mon")
export const getShortDayName = (date) => {
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	return days[date.getDay()];
};

// Create date from object (simplified)
export const fromObject = (obj) => {
	const date = new Date();
	if (obj.year) {date.setFullYear(obj.year);}
	if (obj.month) {date.setMonth(obj.month - 1);} // JS months are 0-indexed
	if (obj.day) {date.setDate(obj.day);}
	if (obj.hour) {date.setHours(obj.hour);}
	if (obj.minute) {date.setMinutes(obj.minute);}
	return date;
}; 