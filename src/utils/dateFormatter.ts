
// Date formatting utility
export const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (error) {
    console.error('Invalid date format:', dateString);
    return dateString;
  }
};

// Format time
export const formatTime = (timeString?: string): string => {
  if (!timeString) return '';
  
  try {
    // Handle different time formats
    if (timeString.includes(':')) {
      // Already in time format
      return timeString;
    } else {
      // Try to parse as a date
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch (error) {
    console.error('Invalid time format:', timeString);
    return timeString;
  }
};
