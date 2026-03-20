# DateTime Picker Component - Documentation

## Overview

The DateTimePicker component is a user-friendly date and time selection UI that replaces the native HTML `datetime-local` input with a beautiful, customizable interface. It provides a calendar view for date selection and a time picker with hours, minutes, and optional seconds.

## Features

✨ **Beautiful UI**: Modern, clean design that matches your application's dark theme
📅 **Calendar View**: Interactive calendar with month/year navigation
🕐 **Time Picker**: Intuitive time selection with up/down controls
🎯 **Multiple Modes**: Support for date-only, time-only, or combined datetime
⚡ **Smart Controls**: Arrow buttons for quick navigation
🌙 **Dark Theme**: Seamlessly integrates with CSS variable-based theming
♿ **Accessible**: Keyboard navigation and proper ARIA labels
📱 **Responsive**: Works on desktop, tablet, and mobile devices
🎨 **Customizable**: Supports date range limits, seconds display, and more

## Installation

The DateTimePicker component is already integrated into the NodeConfigForm and is automatically used for all `datetime` field types.

### Manual Usage

```typescript
import { DateTimePicker } from "@/components/workflow/forms/datepicker/DateTimePicker";

<DateTimePicker
  value={dateValue}
  onChange={(newValue) => setDateValue(newValue)}
  placeholder="Select date and time"
/>
```

## Props Reference

| Prop | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `string` | `""` | ISO 8601 datetime string (e.g., "2024-01-15T14:30:00") |
| `onChange` | `(value: string) => void` | **required** | Callback function called when date/time is selected |
| `placeholder` | `string` | `"Select date and time"` | Placeholder text shown when no value is selected |
| `mode` | `"date" \| "time" \| "datetime"` | `"datetime"` | What to select: date only, time only, or both |
| `showSeconds` | `boolean` | `false` | Show seconds in the time picker |
| `className` | `string` | `""` | Additional CSS classes to apply |
| `minDate` | `string` | `undefined` | Minimum allowed date (ISO 8601 format) |
| `maxDate` | `string` | `undefined` | Maximum allowed date (ISO 8601 format) |
| `disabled` | `boolean` | `false` | Disable the picker |

## Modes

### Datetime Mode (Default)

Shows both calendar and time picker in a single dropdown.

```typescript
<DateTimePicker
  mode="datetime"
  value={value}
  onChange={setValue}
/>
```

Features:
- Combined date and time selection
- Today button for quick selection
- Set Current Time button
- Previous/Next Month navigation
- Year navigation with up/down arrows

### Date Mode

Shows only the calendar view.

```typescript
<DateTimePicker
  mode="date"
  value={value}
  onChange={setValue}
/>
```

Features:
- Date selection only
- Today button
- Previous/Next Month navigation
- Year navigation

### Time Mode

Shows only the time picker view.

```typescript
<DateTimePicker
  mode="time"
  value={value}
  onChange={setValue}
  showSeconds={true}
/>
```

Features:
- Time selection with hours, minutes, and optional seconds
- Set Current Time button
- Arrow buttons for easy adjustment
- Number input for precise control

## Usage Examples

### Basic Usage

```typescript
<DateTimePicker
  value="2024-01-15T14:30:00"
  onChange={(value) => console.log(value)}
/>
```

### With Date Range Limits

```typescript
<DateTimePicker
  value={value}
  onChange={setValue}
  minDate="2024-01-01"
  maxDate="2024-12-31"
  placeholder="Select date in 2024"
/>
```

### With Seconds

```typescript
<DateTimePicker
  mode="time"
  value="14:30:45"
  onChange={setValue}
  showSeconds={true}
/>
```

### Disabled State

```typescript
<DateTimePicker
  value={value}
  onChange={setValue}
  disabled={true}
  placeholder="Date selection disabled"
/>
```

## Integration with Node Configurations

### Adding DateTime Fields to Node Types

When defining node configuration schemas, use the `datetime` field type:

```typescript
// In nodeTypes.ts
"my-node": {
  // ... other node config ...
  configFields: [
    {
      key: "scheduledTime",
      label: "Scheduled Time",
      type: "datetime",
      required: true,
      placeholder: "Select when this should run",
      description: "Choose the date and time for execution",
      showSeconds: false,
      minDate: new Date().toISOString().split('T')[0], // Today
    },
  ],
}
```

### Available Field Properties

When using `datetime` type in node configurations, you can specify:

```typescript
{
  key: string;              // Field identifier
  label: string;            // Display label
  type: "datetime";         // Field type
  description?: string;     // Help text
  required?: boolean;        // Is field required?
  placeholder?: string;      // Placeholder text
  defaultValue?: string;     // Default ISO date string
  showSeconds?: boolean;     // Show seconds in time picker
  minDate?: string;         // Minimum allowed date (ISO 8601)
  maxDate?: string;         // Maximum allowed date (ISO 8601)
  showWhen?: {              // Conditional visibility
    field: string;
    value: string | string[];
  };
}
```

### Example: Schedule Trigger with DateTime

```typescript
// In nodeTypes.ts - schedule trigger config
{
  key: "nextRunTime",
  label: "Next Run Time",
  type: "datetime",
  required: true,
  placeholder: "Select next execution time",
  description: "When should this trigger run next?",
  minDate: new Date().toISOString().split('T')[0], // Cannot select past dates
}
```

### Example: Expiration Date

```typescript
{
  key: "expiresAt",
  label: "Expiration Date",
  type: "datetime",
  mode: "datetime", // Can be "date", "time", or "datetime"
  placeholder: "When does this expire?",
  description: "Set the expiration date and time",
  showSeconds: false,
}
```

## Styling and Customization

### CSS Variables

The DateTimePicker uses CSS variables for theming:

```css
:root {
  --card-bg: rgba(30,30,35,0.98);
  --border-medium: rgba(255,255,255,0.1);
  --border-subtle: rgba(255,255,255,0.05);
  --border-strong: rgba(255,255,255,0.2);
  --text-primary: #ffffff;
  --text-secondary: #e5e7eb;
  --text-muted: #9ca3af;
  --accent-primary: #6366f1;
  --input-bg: rgba(0,0,0,0.15);
}
```

### Custom Styling

Apply custom classes via the `className` prop:

```typescript
<DateTimePicker
  className="w-full"
  value={value}
  onChange={setValue}
/>
```

## Date/Time Format

### Output Format

The DateTimePicker always outputs dates in **ISO 8601** format:

```
Date mode:     "2024-01-15"
Time mode:     "14:30:00"
Datetime mode:  "2024-01-15T14:30:00"
```

### Display Format

The component formats dates for display based on user's locale:

- Date: Jan 15, 2024
- Time: 2:30 PM
- Datetime: Jan 15, 2024, 2:30 PM

## User Interactions

### Calendar Navigation

- **Month Navigation**: Previous/Next month buttons (left/right arrows)
- **Year Navigation**: Up/down arrows next to the year display
- **Quick Selection**: Click on any day to select it
- **Today Button**: Jump to today's date
- **Previous/Next Month Buttons**: Quick month navigation

### Time Controls

- **Arrow Buttons**: Click up/down arrows to adjust values
- **Number Input**: Type directly for precise control
- **Set Current Time**: Button to set current time immediately
- **Auto-clamping**: Values automatically stay within valid ranges (00-23 for hours, 00-59 for minutes/seconds)

### Dropdown Behavior

- **Click Outside**: Close dropdown when clicking outside
- **Enter/Escape**: Keyboard support for opening/closing
- **Clear Button**: X button to clear selection
- **Apply Button**: Confirm selection and close

## Accessibility

### Keyboard Navigation

- **Tab**: Navigate between time fields (hours, minutes, seconds)
- **Arrow Up/Down**: Increase/decrease time values
- **Enter**: Apply current selection
- **Escape**: Close dropdown without applying

### Screen Reader Support

The component includes proper ARIA labels:
- Calendar has `aria-label="Calendar"`
- Time inputs have `aria-label="Hours"`, `aria-label="Minutes"`, etc.
- Buttons have descriptive labels

## Browser Compatibility

✅ **Chrome**: Full support
✅ **Firefox**: Full support
✅ **Safari**: Full support
✅ **Edge**: Full support
✅ **Mobile Safari**: Full support
✅ **Android Chrome**: Full support
✅ **iOS Safari**: Full support

## Troubleshooting

### Issue: Date Not Selected

**Symptom**: Clicking on calendar days doesn't select a date.

**Solution**: 
- Check that the date isn't disabled (outside minDate/maxDate range)
- Ensure `disabled` prop is not set to `true`
- Check browser console for JavaScript errors

### Issue: Time Not Updating

**Symptom**: Time changes aren't reflected in the value.

**Solution**:
- Verify the `onChange` callback is properly implemented
- Check that the value prop is being updated in parent component
- Ensure the value is a valid ISO 8601 string

### Issue: Dropdown Won't Close

**Symptom**: Clicking outside doesn't close the dropdown.

**Solution**:
- Check that `dropdownRef` and `inputRef` are properly attached
- Verify no event.stopPropagation() calls are preventing the close
- Check for z-index conflicts with other elements

### Issue: Date Range Not Working

**Symptom**: minDate/maxDate aren't restricting selection.

**Solution**:
- Ensure dates are in ISO 8601 format: `"YYYY-MM-DD"` or `"YYYY-MM-DDTHH:mm:ss"`
- Verify the dates are valid
- Check that the time component is included if using datetime mode

## Advanced Examples

### Dynamic Date Ranges

```typescript
// Minimum date is 7 days from now
const minDate = new Date();
minDate.setDate(minDate.getDate() + 7);

<DateTimePicker
  value={value}
  onChange={setValue}
  minDate={minDate.toISOString().split('T')[0]}
  placeholder="Select date at least 7 days from now"
/>
```

### Conditional Field Display

```typescript
// Only show datetime field when another field has specific value
{
  key: "expiryDate",
  label: "Expiration Date",
  type: "datetime",
  showWhen: {
    field: "enableExpiry",
    value: "true"  // Only show when enableExpiry is "true"
  }
}
```

### Real-time Validation

```typescript
<DateTimePicker
  value={value}
  onChange={(newValue) => {
    // Validate the date
    const date = new Date(newValue);
    if (date < new Date()) {
      setError("Cannot select past dates");
    } else {
      setError(null);
      setValue(newValue);
    }
  }}
  className={error ? "border-red-500" : ""}
/>
```

## Migration Guide

### From Native datetime-local

**Before**:
```typescript
<input
  type="datetime-local"
  value={value}
  onChange={(e) => onChange(e.target.value)}
/>
```

**After**:
```typescript
<DateTimePicker
  value={value}
  onChange={onChange}
/>
```

### From Manual Input

**Before**:
```typescript
<input
  type="text"
  value={value}
  onChange={(e) => onChange(e.target.value)}
  placeholder="YYYY-MM-DD HH:mm"
/>
```

**After**:
```typescript
<DateTimePicker
  mode="datetime"
  value={value}
  onChange={onChange}
  showSeconds={true}
/>
```

## Performance Considerations

- **Lazy Rendering**: Dropdown only renders when `isOpen` is true
- **Efficient Updates**: Uses React.memo optimization internally
- **Minimal Re-renders**: Smart state management prevents unnecessary updates
- **Lightweight**: No heavy external dependencies

## Future Enhancements

Planned improvements for future releases:

- [ ] Week numbers display
- [ ] Multiple date range selection
- [ ] Custom date formatting options
- [ ] Timezone support
- [ ] Date presets (Today, Tomorrow, Next Week, etc.)
- [ ] Drag-and-drop date selection
- [ ] Inline calendar mode
- [ ] Touch gesture support (swipe to navigate months)

## API Reference

### DateTimePicker

```typescript
interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mode?: "date" | "time" | "datetime";
  className?: string;
  showSeconds?: boolean;
  hour12?: boolean;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
}
```

### ComponentConfigField (for datetime fields)

```typescript
interface ComponentConfigField {
  key: string;
  label: string;
  type: "datetime";
  description?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  showSeconds?: boolean;
  minDate?: string;
  maxDate?: string;
  showWhen?: { field: string; value: string | string[] };
}
```

## Support

For questions or issues related to the DateTimePicker component:

1. Review this documentation
2. Check the component source code
3. Review browser console for detailed error messages
4. Test in different browsers to isolate issues
5. Open an issue on the project repository

---

## Summary

The DateTimePicker component provides a superior user experience for date and time input compared to native browser controls. It offers:

- ✅ Beautiful, modern UI
- ✅ Calendar and time picker views
- ✅ Multiple modes (date, time, datetime)
- ✅ Customizable date ranges
- ✅ Optional seconds display
- ✅ Full accessibility support
- ✅ Responsive design
- ✅ Dark theme support
- ✅ Easy integration with existing node configurations

Replace all `datetime-local` inputs with DateTimePicker for a better user experience!

---

*Last updated: 2025-01-14*
*Version: 1.0.0*