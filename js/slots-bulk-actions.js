// ============================================================
// slots-bulk-actions.js — extracted from original superadmin.html (module split)
// ============================================================

        // Toggle all checkboxes
        function toggleAllCheckboxes(master) {
          document.querySelectorAll(".slot-checkbox").forEach(cb => {
            cb.checked = master.checked;
          });
        }

        // Get selected slot IDs
        function getSelectedSlots() {
          const selected = [];
          document.querySelectorAll(".slot-checkbox:checked").forEach(cb => {
            selected.push(cb.dataset.id);
          });
          return selected;
        }

        // Bulk delete
        async function bulkDelete() {
          const ids = getSelectedSlots();
          if (ids.length === 0) {
            showToast("No slots selected", "warning");
            return;
          }
          if (!confirm(`Delete ${ids.length} selected slots?`)) return;

          const response = await fetch('/api/admin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'bulkDelete',
              ids
            })
          });

          if (!response.ok) {
            showToast("Delete failed");
            return;
          }

          showToast(`${ids.length} slots deleted`);
          loadSlots();
        }

        // Bulk change status
        async function bulkChangeStatus() {
          const status = document.getElementById("bulk-status").value;
          if (!status) return;

          const ids = getSelectedSlots();
          if (ids.length === 0) {
            showToast("No slots selected", "warning");
            return;
          }

          const response = await fetch('/api/admin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'bulkStatus',
              ids,
              status
            })
          });

          if (!response.ok) {
            showToast("Status update failed");
            return;
          }

showToast(`Status updated to "${status}" for ${ids.length} slots`);
          loadSlots();
        }

        // BULK COPY SLOTS to N days ahead
        async function bulkCopySlots(days) {
          const ids = getSelectedSlots();

          if (ids.length === 0) {
            showToast("No slots selected", "warning");
            return;
          }

          // Determine label for confirmation message
          let label;
          if (days === 1) {
            label = "tomorrow (+1 day)";
          } else if (days === 7) {
            label = "next 7 days (a week)";
          } else {
            label = `next ${days} days`;
          }

          if (!confirm(`Copy ${ids.length} selected slot(s) to each of the ${label}?`)) return;

          let totalSuccess = 0;
          let totalSkipped = 0;

          // Always copy across every day from +1 up to +days — not just a single offset.
          const daysToCopy = Array.from({ length: days }, (_, i) => i + 1);

          for (const dayOffset of daysToCopy) {
            for (const id of ids) {
              // Find original slot data in memory
              const original = allData.find(s => String(s.id) === String(id));
              if (!original) { totalSkipped++; continue; }

              // Calculate new date
              const oldDate = new Date(original.date);
              oldDate.setDate(oldDate.getDate() + dayOffset);
              const newDate = oldDate.toLocaleDateString("sv-SE"); // YYYY-MM-DD

              // Skip if duplicate exists
              const duplicate = allData.find(s =>
                s.date === newDate &&
                String(s.court_id) === String(original.court_id) &&
                s.start_time === original.start_time
              );

              if (duplicate) {
                totalSkipped++;
                continue;
              }

              // POST new slot
              const res = await fetch("/api/admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "add",
                  data: {
                    date: newDate,
                    court_id: original.court_id,
                    start_time: original.start_time,
                    end_time: original.end_time,
                    time: `${original.start_time} - ${original.end_time}`,
                    price: original.price,
                    status: "available"
                  }
                })
              });

              if (res.ok) { totalSuccess++; } else { totalSkipped++; }
            }
          }

          // Final toast message
          let msg = `✅ ${totalSuccess} slot(s) copied`;
          if (days === 7) {
            msg += ` for each day in next week`;
          }
          if (totalSkipped > 0) {
            msg += ` | ⚠️ ${totalSkipped} skipped (duplicate or error)`;
          }
          showToast(msg);
          loadSlots();
        }

      