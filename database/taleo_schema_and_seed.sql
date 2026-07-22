--
-- PostgreSQL database dump
--

\restrict anYdf33O56MlaFJjVV8bFUrfU3Qdz4hPoFbboYRCgu34Re0gsTSDBQM9Bq8FxCL

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: dropdown_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dropdown_categories (
    id smallint NOT NULL,
    code character varying(50) NOT NULL
);


--
-- Name: TABLE dropdown_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dropdown_categories IS 'Identifies which dropdown a set of options belongs to. Question text lives in the frontend, not here.';


--
-- Name: dropdown_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dropdown_categories_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dropdown_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dropdown_categories_id_seq OWNED BY public.dropdown_categories.id;


--
-- Name: dropdown_option_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dropdown_option_translations (
    option_id uuid NOT NULL,
    language_id smallint NOT NULL,
    label character varying(150) NOT NULL
);


--
-- Name: TABLE dropdown_option_translations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dropdown_option_translations IS 'Translated display label for each dropdown option, one row per option/language pair.';


--
-- Name: dropdown_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dropdown_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id smallint NOT NULL,
    code character varying(50) NOT NULL
);


--
-- Name: TABLE dropdown_options; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dropdown_options IS 'All available choices for every dropdown category. Stable codes only أ¢â‚¬â€‌ translated labels live in dropdown_option_translations.';


--
-- Name: interest_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interest_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    phone_number character varying(32) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_phone_number_format CHECK (((phone_number)::text ~ '^\+[1-9][0-9]{7,14}$'::text))
);


--
-- Name: TABLE interest_registrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.interest_registrations IS 'Each person who registered interest in Taleo. Registration only أ¢â‚¬â€‌ no payment.';


--
-- Name: COLUMN interest_registrations.phone_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interest_registrations.phone_number IS 'International format, e.g. +60123456789. Unique so re-registering does not inflate the live counter.';


--
-- Name: languages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.languages (
    id smallint NOT NULL,
    code character varying(5) NOT NULL,
    name character varying(50) NOT NULL
);


--
-- Name: TABLE languages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.languages IS 'Languages supported for translating dropdown-option labels. Not a user-facing selection field.';


--
-- Name: languages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.languages_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: languages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.languages_id_seq OWNED BY public.languages.id;


--
-- Name: registration_dropdown_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registration_dropdown_answers (
    registration_id uuid NOT NULL,
    category_id smallint NOT NULL,
    option_id uuid NOT NULL
);


--
-- Name: TABLE registration_dropdown_answers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.registration_dropdown_answers IS 'Dropdown selections made by each registration. One answer per category per registration.';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'ADMIN'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['ADMIN'::character varying, 'VIP'::character varying])::text[])))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'Accounts that can log in to manage the system (e.g. dropdown options). Not related to interest_registrations.';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_hash IS 'Hashed password only (e.g. bcrypt/argon2) أ¢â‚¬â€‌ never store plain-text passwords.';


--
-- Name: COLUMN users.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.role IS 'Currently only ADMIN exists. Extendable later by adding values to the CHECK constraint.';


--
-- Name: dropdown_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dropdown_categories ALTER COLUMN id SET DEFAULT nextval('public.dropdown_categories_id_seq'::regclass);


--
-- Name: languages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.languages ALTER COLUMN id SET DEFAULT nextval('public.languages_id_seq'::regclass);


--
-- Data for Name: dropdown_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dropdown_categories (id, code) FROM stdin;
1	BOOK_FOR
2	FORMAT_INTEREST
\.


--
-- Data for Name: dropdown_option_translations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dropdown_option_translations (option_id, language_id, label) FROM stdin;
d65ae090-b8e9-4388-b502-2425eb0fb7df	1	My child
d65ae090-b8e9-4388-b502-2425eb0fb7df	3	Anak saya
ae833ada-3b43-4a78-befe-7ab367ccc85e	1	Younger sibling
ae833ada-3b43-4a78-befe-7ab367ccc85e	3	Adik
94aa91fe-78de-4ee9-92e9-8676751ef4c1	1	Niece or nephew
94aa91fe-78de-4ee9-92e9-8676751ef4c1	3	Anak saudara
679bedca-1507-4844-99c4-bcacb02054b4	1	Grandchild
679bedca-1507-4844-99c4-bcacb02054b4	3	Cucu
f693a1df-5f84-4fa6-8ffe-32aed8cb2353	1	A gift for someone
f693a1df-5f84-4fa6-8ffe-32aed8cb2353	3	Hadiah untuk seseorang
57a03cff-3a14-4255-ac2e-e0121dce6d50	1	Other
57a03cff-3a14-4255-ac2e-e0121dce6d50	3	Lain-lain
3802ba50-e3d5-464e-b712-e57862a6a52c	1	Printed book
3802ba50-e3d5-464e-b712-e57862a6a52c	3	Buku bercetak
5e2b071b-7fa9-4616-bb77-2f00e2ec47eb	1	Digital book
5e2b071b-7fa9-4616-bb77-2f00e2ec47eb	3	Buku digital
90f4f2ef-b3c6-4216-ab3b-5f8c56870f61	1	Both
90f4f2ef-b3c6-4216-ab3b-5f8c56870f61	3	Kedua-duanya
d65ae090-b8e9-4388-b502-2425eb0fb7df	2	ط·ظپظ„ظٹ
ae833ada-3b43-4a78-befe-7ab367ccc85e	2	ط£ط® ط£ظˆ ط£ط®طھ ط£طµط؛ط±
94aa91fe-78de-4ee9-92e9-8676751ef4c1	2	ط§ط¨ظ† ط£ظˆ ط§ط¨ظ†ط© ط§ظ„ط£ط® ط£ظˆ ط§ظ„ط£ط®طھ
679bedca-1507-4844-99c4-bcacb02054b4	2	ط­ظپظٹط¯ ط£ظˆ ط­ظپظٹط¯ط©
f693a1df-5f84-4fa6-8ffe-32aed8cb2353	2	ظ‡ط¯ظٹط© ظ„ط´ط®طµ ظ…ط§
57a03cff-3a14-4255-ac2e-e0121dce6d50	2	ط¢ط®ط±
3802ba50-e3d5-464e-b712-e57862a6a52c	2	ظƒطھط§ط¨ ظ…ط·ط¨ظˆط¹
5e2b071b-7fa9-4616-bb77-2f00e2ec47eb	2	ظƒطھط§ط¨ ط±ظ‚ظ…ظٹ
90f4f2ef-b3c6-4216-ab3b-5f8c56870f61	2	ظƒظ„ط§ظ‡ظ…ط§
\.


--
-- Data for Name: dropdown_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dropdown_options (id, category_id, code) FROM stdin;
d65ae090-b8e9-4388-b502-2425eb0fb7df	1	MY_CHILD
ae833ada-3b43-4a78-befe-7ab367ccc85e	1	YOUNGER_SIBLING
94aa91fe-78de-4ee9-92e9-8676751ef4c1	1	NIECE_NEPHEW
679bedca-1507-4844-99c4-bcacb02054b4	1	GRANDCHILD
f693a1df-5f84-4fa6-8ffe-32aed8cb2353	1	GIFT
57a03cff-3a14-4255-ac2e-e0121dce6d50	1	OTHER
3802ba50-e3d5-464e-b712-e57862a6a52c	2	PRINTED_BOOK
5e2b071b-7fa9-4616-bb77-2f00e2ec47eb	2	DIGITAL_BOOK
90f4f2ef-b3c6-4216-ab3b-5f8c56870f61	2	BOTH
\.


--
-- Data for Name: interest_registrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interest_registrations (id, name, phone_number, created_at) FROM stdin;
\.


--
-- Data for Name: languages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.languages (id, code, name) FROM stdin;
1	en	English
2	ar	Arabic
3	ms	Bahasa Melayu
\.


--
-- Data for Name: registration_dropdown_answers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.registration_dropdown_answers (registration_id, category_id, option_id) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, role, created_at) FROM stdin;
\.


--
-- Name: dropdown_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.dropdown_categories_id_seq', 2, true);


--
-- Name: languages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.languages_id_seq', 3, true);


--
-- Name: dropdown_categories dropdown_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dropdown_categories
    ADD CONSTRAINT dropdown_categories_pkey PRIMARY KEY (id);


--
-- Name: dropdown_option_translations dropdown_option_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dropdown_option_translations
    ADD CONSTRAINT dropdown_option_translations_pkey PRIMARY KEY (option_id, language_id);


--
-- Name: dropdown_options dropdown_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dropdown_options
    ADD CONSTRAINT dropdown_options_pkey PRIMARY KEY (id);


--
-- Name: interest_registrations interest_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interest_registrations
    ADD CONSTRAINT interest_registrations_pkey PRIMARY KEY (id);


--
-- Name: languages languages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_pkey PRIMARY KEY (id);


--
-- Name: registration_dropdown_answers registration_dropdown_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_dropdown_answers
    ADD CONSTRAINT registration_dropdown_answers_pkey PRIMARY KEY (registration_id, category_id);


--
-- Name: dropdown_categories uq_dropdown_categories_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dropdown_categories
    ADD CONSTRAINT uq_dropdown_categories_code UNIQUE (code);


--
-- Name: dropdown_options uq_dropdown_options_category_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dropdown_options
    ADD CONSTRAINT uq_dropdown_options_category_code UNIQUE (category_id, code);


--
-- Name: dropdown_options uq_dropdown_options_id_category; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dropdown_options
    ADD CONSTRAINT uq_dropdown_options_id_category UNIQUE (id, category_id);


--
-- Name: interest_registrations uq_interest_registrations_phone_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interest_registrations
    ADD CONSTRAINT uq_interest_registrations_phone_number UNIQUE (phone_number);


--
-- Name: languages uq_languages_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT uq_languages_code UNIQUE (code);


--
-- Name: users uq_users_email; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_email UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_answers_option_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_answers_option_id ON public.registration_dropdown_answers USING btree (option_id);


--
-- Name: idx_dropdown_options_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dropdown_options_category_id ON public.dropdown_options USING btree (category_id);


--
-- Name: idx_translations_language_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_translations_language_id ON public.dropdown_option_translations USING btree (language_id);


--
-- Name: dropdown_option_translations dropdown_option_translations_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dropdown_option_translations
    ADD CONSTRAINT dropdown_option_translations_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.languages(id) ON DELETE RESTRICT;


--
-- Name: dropdown_option_translations dropdown_option_translations_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dropdown_option_translations
    ADD CONSTRAINT dropdown_option_translations_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.dropdown_options(id) ON DELETE CASCADE;


--
-- Name: dropdown_options dropdown_options_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dropdown_options
    ADD CONSTRAINT dropdown_options_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.dropdown_categories(id) ON DELETE RESTRICT;


--
-- Name: registration_dropdown_answers fk_answer_option_matches_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_dropdown_answers
    ADD CONSTRAINT fk_answer_option_matches_category FOREIGN KEY (option_id, category_id) REFERENCES public.dropdown_options(id, category_id) ON DELETE RESTRICT;


--
-- Name: registration_dropdown_answers registration_dropdown_answers_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_dropdown_answers
    ADD CONSTRAINT registration_dropdown_answers_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.dropdown_categories(id) ON DELETE RESTRICT;


--
-- Name: registration_dropdown_answers registration_dropdown_answers_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_dropdown_answers
    ADD CONSTRAINT registration_dropdown_answers_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.interest_registrations(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict anYdf33O56MlaFJjVV8bFUrfU3Qdz4hPoFbboYRCgu34Re0gsTSDBQM9Bq8FxCL
