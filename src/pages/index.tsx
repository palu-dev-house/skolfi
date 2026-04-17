import type { GetServerSideProps } from "next";

// Portal disabled — redirect all visitors to admin login
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: { destination: "/admin/login", permanent: false },
  };
};

export default function HomePage() {
  return null;
}
