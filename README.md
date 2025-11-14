# TrackMyDegree

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=iKozay_TrackMyDegree&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=iKozay_TrackMyDegree) [![Bugs](https://sonarcloud.io/api/project_badges/measure?project=iKozay_TrackMyDegree&metric=bugs)](https://sonarcloud.io/summary/new_code?id=iKozay_TrackMyDegree) [![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=iKozay_TrackMyDegree&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=iKozay_TrackMyDegree) [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=iKozay_TrackMyDegree&metric=coverage)](https://sonarcloud.io/summary/new_code?id=iKozay_TrackMyDegree) [![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=iKozay_TrackMyDegree&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=iKozay_TrackMyDegree)

### [Try Now](https://stg.trackmydegree.ca)

### Release 1 Deliverable
- [Presentation](https://docs.google.com/presentation/d/1CXDA9PgEQqeyCek9WGNIhLl0sTdgGOUpxeh2253D3KQ/edit?usp=sharing)
- [Release 1 Recording](https://drive.google.com/file/d/1fO3a01xsnKcHV5yNjyjl9w3tKsCbWC45/view?usp=sharing)

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

| Name                             | Student ID | Github ID                                                   | Email Adress                   |
|----------------------------------|------------|-------------------------------------------------------------|--------------------------------|
| Abdelmalek Mouhamou              | 40255934   | [AbdelmalekMouhamou](https://github.com/AbdelmalekMouhamou) | abdelmalekmou@gmail.com        |
| Anh Thien Nguyen                 | 40122030   | [chrisanhthien](https://github.com/chrisanhthien)           | nathien2310@gmail.com          |
| Beaudelaire Tsoungui Nzodoumkouo | 40216598   | [Tsounguinzo](https://github.com/Tsounguinzo)               | beaudelaire.dev@gmail.com      |
| Jessica Beauchemin               | 40188873   | [JBeauche](https://github.com/JBeauche)                     | jessica.beauchemin01@gmail.com |
| Miskat Mahmud                    | 40250110   | [codedsami](https://github.com/codedsami)                   | miskatmahmud0@gmail.com        |
| Mohamed Saidi                    | 40248103   | [Mohadgb](https://github.com/Mohadgb)                       | Saidimoha.pro@gmail.com        |
| Omar Hammodan                    | 40246598   | [Vega32](https://github.com/Vega32)                         | omar.hammodan@gmail.com        |
| Sadee Mohammad Shadman           | 40236919   | [sadeeshadman](https://github.com/sadeeshadman)             | sadeeshadman@gmail.com         |
| Syed Ayaan Jilani                | 40209519   | [CS-ION](https://github.com/CS-ION)                         | asadrubina.ra@gmail.com        |
| Yassine Ibhir                    | 40251116   | [Yibhir0](https://github.com/Yibhir0)                       | yibhir101@gmail.com            |
| Zeiad Badawy                     | 40247477   | [iKozay](https://github.com/iKozay)                         | zeiad.badawy@mail.concordia.ca |

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

2. **Set up .env**:
   Copy `.env.example` to `./secrets` directory and assign values for each environment variable.
    
   ```bash
    mkdir -p secrets
    cp .env.example ./secrets/.env
    ```

3. **Install dependencies**:
   ```bash
   cd front-end
   npm i
   cd ../Back-End
   npm i
   cd ..
   npm i
   ```
   
4. **Build and Run the Application**:
   Run the following command to start all components:

   ```bash
   docker compose up -d
   npm run dev
   ```

   This will:

    - Run MongoDB and Redis in docker
    - Start the frontend, backend concurrently.
    - The application should now be running locally at localhost:3000.

## Production Deployment

For production deployment with SSL/HTTPS support, follow these additional steps:

### Prerequisites for Production

- A domain name pointing to your server
- Docker and Docker Compose installed on your production server

### Production Setup Instructions

1. **Complete the development setup steps** (steps 1-2 from the Developer Setup Guide above)

2. **Create environment configuration**:
   Create a `.env` file in the root directory of the project:

   ```bash
   touch .env
   ```

3. **Configure production environment variables**:
   Add the following variables to your `.env` file:

   ```env
   DOMAIN=yourdomain.com
   ACME_EMAIL=your-email@example.com
   ```

   Replace:
   - `yourdomain.com` with your actual domain name
   - `your-email@example.com` with your email address (used for Let's Encrypt SSL certificate registration)

4. **Deploy the application**:
   Run the production deployment command:

   ```bash
   docker compose -f docker-compose.prd.yml up -d
   ```

   This will:
   - Build and start all services in detached mode
   - Automatically obtain SSL certificates via Let's Encrypt
   - Configure HTTPS redirection
   - Set up the reverse proxy with SSL termination

5. **Verify deployment**:
   - Your application should be accessible at `https://yourdomain.com`
   - HTTP traffic will automatically redirect to HTTPS
   - SSL certificates will auto-renew before expiration

**Production Notes:**
- Ensure your domain's DNS A record points to your server's IP address
- Allow ports 80 (HTTP) and 443 (HTTPS) through your firewall
- The initial SSL certificate generation may take a few minutes
- Monitor logs with `docker compose logs -f` if needed

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

