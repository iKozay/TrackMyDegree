# TrackMyDegree

### [Try Now](https://trackmydegree.com)

### Project summary

TrackMyDegree empowers Concordia students to seamlessly plan their academic journey with an interactive, intuitive
platform that generates course sequences. It allows students to view course prerequisites, core requirements, and
graduation timelines, ensuring they can easily navigate their degree requirements without feeling overwhelmed.

The platform leverages features like document scanning, which automatically populates academic profiles based on
unofficial transcripts and admission letters, which can save a lot of time. It also offers personalized technical
elective recommendations based on students' career goals and academic history, aiding students in making informed
choices. When students change degrees, TrackMyDegree simplifies credit transfer by identifying equivalent courses,
ensuring a smooth transition that maximizes academic credits.

Real-time curriculum updates keep students informed of any changes impacting their degree path, allowing them to adjust
plans proactively to graduate on schedule. As a bonus, future Concordia students from CEGEP or high school can explore
potential degree paths, complete with transfer credit options.

TrackMyDegree targets Concordia’s students and advisors, starting with the Gina Cody School of Engineering and Computer
Science, with plans to expand across departments. By streamlining communication and automating advising functions,
TrackMyDegree reduces wait times, empowering advisors to focus on complex issues and enhancing the academic journey for
all. At its core, TrackMyDegree is a student-centric solution, bringing clarity, adaptability, and flexibility to
academic planning and setting a new standard in educational technology.

### Mockups

Mockup designs made using
Figma: [Here](https://www.figma.com/design/SBv0R8mN0K9N2jVbV42wol/TrackMyDegree--V2-?node-id=0-1&t=52CdgQnGAGi4ShXk-1)

### Team members

| Name                             | Student ID | Github ID                                         | Email Adress                   |
|----------------------------------|------------|---------------------------------------------------|--------------------------------|
| Abdelmalek Mouhamou              | 40255934   |                                                   | abdelmalekmou@gmail.com        |
| Anh Thien Nguyen                 | 40122030   | [chrisanhthien](https://github.com/chrisanhthien) | nathien2310@gmail.com          |
| Beaudelaire Tsoungui Nzodoumkouo | 40216598   | [Tsounguinzo](https://github.com/Tsounguinzo)     | beaudelaire.dev@gmail.com      |
| Jessica Beauchemin               | 40188873   | [JBeauche](https://github.com/JBeauche)           | jessica.beauchemin01@gmail.com |
| Miskat Mahmud                    | 40250110   |                                                   | miskatmahmud0@gmail.com        |
| Mohamed Saidi                    | 40248103   |   [Mohadgb](https://github.com/Mohadgb)                                                | Saidimoha.pro@gmail.com        |
| Omar Hammodan                    | 40246598   |     [Vega32](https://github.com/Vega32)                                              | omar.hammodan@gmail.com        |
| Sadee Mohammad Shadman           | 40236919   |   [sadeeshadman](https://github.com/sadeeshadman)                                                | sadeeshadman@gmail.com         |
| Syed Ayaan Jilani                | 40209519   |    [CS-ION](https://github.com/CS-ION)                                               | asadrubina.ra@gmail.com        |
| Yassine Ibhir                    | 40251116   |  [Yibhir0](https://github.com/Yibhir0)                                                 | yibhir101@gmail.com            |
| Zeiad Badawy                     | 40247477   | [iKozay](https://github.com/iKozay)               | zeiad.badawy@mail.concordia.ca |

## Developer Setup Guide

Welcome to the project! This guide will help you get set up to run and develop locally.

### Prerequisites

Ensure you have the following installed on your machine:

- **Git**: For cloning the repository.
- **Docker**: For containerization.
- **Docker Compose**: To manage multi-container applications.
- **Yarn** and **npm**: This project requires both package managers.

### Setup Instructions

1. **Clone the repository**:

   ```bash
   git clone https://github.com/iKozay/TrackMyDegree.git
   cd TrackMyDegree
   ```

2. **Build and Run the Application**:
   Run the following command to start all components:

   ```bash
   docker compose up --build
   ```

   This will:

    - Build the docker images
    - Start the frontend, backend and database components.
    - The application should now be running locally.

**Common Issues**
Port already in use:

- You can change the port to an available one in the docker compose yml file;
- Re-run the code from step #2.

## Equity and Diversity Statement

At TrackMyDegree, our core belief is that we welcome users from diverse backgrounds, cultural perspectives, races,
castes, and genders. We value people with diverse ideas and experiences and intend to provide a safe environment.

The app is designed to make it intuitive and simple to navigate for all users, regardless of their technical ability. We
are dedicated to catering to all groups and providing every user with equal opportunities to plan and use the app
without any barriers.

## Disclaimer

TrackMyDegree🎓 can make mistakes. Please check the important information.
Note that this website is an independent helper tool and is not affiliated with Concordia University.
It is designed to provide supplementary assistance and should not be solely relied upon for academic or administrative
decisions.

## Privacy Statement for TrackMyDegree.com

**Effective Date:** 2025-04-02

At TrackMyDegree.com, we take your privacy seriously. This privacy statement outlines how we handle and protect your
data when using our website.

### Data Collection & Storage

We only store data essential to providing our services. Specifically:

- **Account Information:** If you choose to create an account, we store only the necessary credentials to facilitate
  login and access to your saved data.
- **Course Sequence Data:** We store non-identifiable course sequences that users voluntarily save. This includes
  courses taken and their respective dates but does not contain personally identifiable information.
- **Acceptance Letter/Transcript Uploads:** Users may upload transcripts to extract course information. While
  transcripts may contain personal data, we do not store, retain, or even view this information. Any personal data is
  stripped out immediately during processing.

We do not collect or store any personal data unless you explicitly save your course information.

### Data Usage & Sharing

- Your data is used solely for the purpose of helping you track your degree progress.
- We do not share, sell, or disclose any stored data to third parties.
- All stored data is anonymized and cannot be linked to individual users.

### User Control & Deletion

- You have full control over your saved data.
- You may delete your course history at any time, after which the data will be permanently removed from our system.

If you have any questions, please contact us at trackmydegree@gmail.com

