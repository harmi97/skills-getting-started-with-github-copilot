document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      // avoid stale cached response
      const response = await fetch("/activities", { cache: "no-cache" });
      const activities = await response.json();

      // Clear loading message and reset select options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = `<option value="">-- Select an activity --</option>`;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // build html including participants list if any
        let cardHtml = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        if (details.participants && details.participants.length > 0) {
          cardHtml += `
            <div class="participants">
              <strong>Participants:</strong>
              <ul>
                ${details.participants
                  .map(
                    (p) =>
                      `<li>${p}<span class=\"remove-btn\" data-activity=\"${name}\" data-email=\"${p}\">&times;</span></li>`
                  )
                  .join("")}
              </ul>
            </div>
          `;
        }

        activityCard.innerHTML = cardHtml;
        activitiesList.appendChild(activityCard);

        // attach click handlers for delete buttons
        activityCard.querySelectorAll('.remove-btn').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const activity = btn.getAttribute('data-activity');
            const email = btn.getAttribute('data-email');
            try {
              const resp = await fetch(
                `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(
                  email
                )}`,
                { method: 'DELETE' }
              );
              if (resp.ok) {
                fetchActivities(); // refresh list
              } else {
                console.error('Failed to remove participant');
              }
            } catch (error) {
              console.error('Error removing participant', error);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          cache: "no-cache",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // update list to show new participant
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
